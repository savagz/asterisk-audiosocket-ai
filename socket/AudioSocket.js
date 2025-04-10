const net = require("net");
const fs = require("fs");
const util = require("util");
const async = require("async");
const axios = require("axios");
const { TIMEOUT } = require("dns");
const { Transform } = require("stream");
const { setTimeout } = require("timers");

const { AudioSocket } = require("@fonoster/streams");
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const { handlePacketAudio, handleMessage } = require("../utils/packets");
const { readWavFileHeader } = require("../utils/pushstream");

const { speechConfig, audioFormat } = require("../voice/azure");

const AMIService = require("../manager/amiservice");
const { appasterisk, applogger, infotransfer } = require("../config/amiconfig");

require("dotenv").config();

class AudioServer {
    constructor(port = 5001) {
        this.port = port;
        this.audioSocket = new AudioSocket();
        this.ami = new AMIService(appasterisk, applogger);
        this.ami.start();
    }

    start() {
        this.audioSocket.onConnection(async (req, res) => {
            console.log("[HS] Socket Client Connected.", req.ref);
            let _messages = [];
            let _runStreaming = false;
            let _assistant = false;

            // Configure Audio Name
            var fileAudio = null;
            var counter = 1;

            // API WebHook
            const _api = process.env.WEBHOOK_URL_BASE
                ? axios.create({ baseURL: process.env.WEBHOOK_URL_BASE })
                : null;

            // Speech to Text   
            const pushStream = sdk.PushAudioInputStream.create(audioFormat);
            const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

            try {
                recognizer.recognized = async (_, event) => {
                    if (event.privResult.privReason === sdk.ResultReason.RecognizedSpeech) {
                        const _transcript = event.privResult.privText.trim();
    
                        if (_transcript) {
                            _runStreaming = false;
                            handleMessage(req.ref, "user", _transcript, _messages);
    
                            if (_api) {
                                try {
                                    const response = await _api.post(process.env.WEBHOOK_URL, { message: _transcript });
                                    _runStreaming = true;
                                    queue.push({ message: response.data.text });
                                } catch (error) {
                                    _runStreaming = true;
                                    queue.push({ message: "Se ha producido un error. Relájese y disfrute" });
                                }
                            }
                        }
                    }
                };
    
                recognizer.canceled = (_, event) => {
                    console.error(`Cancelado: ${event.reason}`);
                    if (event.reason === sdk.CancellationReason.Error) {
                        console.error(`Error de Azure: ${event.errorDetails}`);
                    }
                    recognizer.stopContinuousRecognitionAsync();
                };
    
                recognizer.startContinuousRecognitionAsync(
                    () => console.log('[HS] Speech Recognition Started'),
                    err => console.error('[HS] Speech Recognition Error:', err)
                );
                
            } catch (error) {
                console.log(err);
            }

            // TRANSFORM
            const _transform = new Transform({
                transform(chunk, _, CB) {
                    //if (!_runStreaming) return CB();
                    try {
                        pushStream.write(chunk);
                        CB();
                    } catch (err) {
                        CB(err);
                    }
                }
            });

            // Text-to-Speech
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

            // QUEUE
            const queue = async.queue(async ({ message }) => {
                try {
                    const result = await new Promise((resolve, reject) => {
                        synthesizer.speakTextAsync(
                            message,
                            (result) => resolve(result),
                            (err) => reject(err)
                        );
                    });

                    handleMessage(req.ref, "assistant", message, _messages);

                    // Configure Audio Name
                    fileAudio = __dirname + "/../output/" + req.ref + "-" + counter + ".wav";
                    counter++;

                    // TRANSFERIR LLAMADA
                    if (message === "Transferir llamada.") { // Enviar palabra clave para transferir.
                        await this.ami.actionRedirect("CONEXION", req.ref, infotransfer.exten, infotransfer.context, infotransfer.priority);

                    } else {
                        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                            await fs.writeFileSync(fileAudio, Buffer.from(result.audioData));
                        }
                        //console.log(readWavFileHeader(fileAudio));
                        res.play(fileAudio);
                    }

                } catch (error) {
                    console.error("[HS] Error synthesizing speech:", error);
                }
            }, 1);

            _runStreaming = true;
            queue.push({ message: "Iniciando servicio de texto a voz, probando calidad del audio" });

            // SOCKET Handlers

            res.socket.on("data", (data) => {
                handlePacketAudio(_transform, data);
            });

            res.socket.on("end", () => {
                console.log("[HS] Socket Client Disconnected. " + req.ref);

                queue.kill();
                _transform.end();
                
                pushStream.close();
                recognizer.stopContinuousRecognitionAsync();
                synthesizer.close();
                
                console.log(util.inspect(_messages, { showHidden: false, depth: null }));
                _messages = [];

                if (fs.existsSync(fileAudio)) {
                    fs.unlinkSync(fileAudio);
                    console.log(`File ${req.ref}.wav Deleted.`);
                }
            });

            res.socket.on("error", (err) => {
                console.error("[HS] Socket error: " + err.message);
                _messages = [];

                pushStream.close();
                recognizer.stopContinuousRecognitionAsync();
                synthesizer.close();
            });

        });

        // START Audio Socket
        this.audioSocket.listen(this.port, () => {
            console.log(`(AZURE) Socket Server Running on Port : ${this.port}`);
        });
    }
}

module.exports = AudioServer;
