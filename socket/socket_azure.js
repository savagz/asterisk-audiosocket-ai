const fs = require("fs");
const net = require("net");
const util = require("util");
const async = require("async");
const axios = require("axios");
const { Transform, PassThrough } = require("stream");
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { handlePacketAzure, handleMessage } = require("../utils/packets");
const { TIMEOUT } = require("dns");
const { setTimeout } = require("timers");

const { speechConfig, audioFormat } = require("../voice/azure");
const { createMessage } = require("../utils/pushstream");

const AMIService = require("../manager/amiservice");
const { appasterisk, applogger, infotransfer } = require("../config/amiconfig");

require("dotenv").config();

const ami = new AMIService(appasterisk, applogger);
if(!ami.getAmiConn()){
    ami.initialize();
}
console.log(`[HS][AZR] - [${process.pid}] : Initialize.`);

function handleSocketAzure(socket) {
    console.log(`[HS][AZR] - [${process.pid}] : Socket Client Connected.`);
    socket.setNoDelay(true);
    let _messages = [];
    let _runStreaming = false;
    let _assistant = false;
    var fileAudio = null;

    // API WebHook
    const _api = process.env.WEBHOOK_URL_BASE
        ? axios.create({ baseURL: process.env.WEBHOOK_URL_BASE +""+ process.env.WEBHOOK_URL_PORT })
        : null;

    // Configuración de audio
    const pushStream = sdk.PushAudioInputStream.create(audioFormat);
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

    // Speech to Text   
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    console.log(`[HS][AZR] - [${process.pid}] : Azure Recognizer Started.`);
    recognizer.recognized = async (_, event) => {
        if (event.privResult.privReason === sdk.ResultReason.RecognizedSpeech) {
            const _transcript = event.privResult.privText.trim();

            if (_transcript) {
                _runStreaming = false;
                handleMessage(socket.uuid, "user", _transcript, _messages);

                if (_api) {
                    try {
                        const response = await _api.post(process.env.WEBHOOK_URL, { message: _transcript });
                        _runStreaming = true;
                        queue.push({ message: response.data.text });
                    } catch (error) {
                        _runStreaming = true;
                        queue.push({ message: "Disculpa no comprendo tu pregunta." });
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

    // TRANSFORM
    const _transform = new Transform({
        transform(chunk, _, CB) {
            if (!_runStreaming) return CB();
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
    console.log(`[HS][AZR] - [${process.pid}] : Azure Synthesizer Started.`);

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

            handleMessage(socket.uuid, "assistant", message, _messages);

            // Configure Audio Name
            fileAudio = __dirname + "/../output/" + socket.uuid + ".wav";

            const { audioData } = result;
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                await fs.writeFileSync(fileAudio, Buffer.from(audioData));
            }

            // TRANSFERIR LLAMADA
            if (message === "Transferir llamada.") { // Enviar palabra clave para transferir.
                await ami.actionRedirect("CONEXION", socket.uuid, infotransfer.exten, infotransfer.context, infotransfer.priority);

            } else {
                const fileStream = fs.readFileSync(fileAudio);
                let offset = 0;
                // eslint-disable-next-line no-loops/no-loops
                while (offset < fileStream.length) {
                    if (!_runStreaming) break;
    
                    const sliceSize = Math.min(fileStream.length - offset, 320);
                    const slicedChunk = fileStream.subarray(offset, offset + sliceSize);
                    const buffer = createMessage(16, slicedChunk);
                    socket.write(buffer);
                    offset += sliceSize;
                    // Wait for 20ms to match the sample rate
                    await new Promise(r => setTimeout(r, 20));
                }
            }
            
        } catch (error) {
            console.log(`[HS][AZR] - [${process.pid}] : Error synthesizing speech: `, error);
        }
    }, 1);

    _runStreaming = true;
    queue.push({ message: "En que puedo ayudarte ?" });

    recognizer.startContinuousRecognitionAsync(
        () => console.log(`[HS][AZR] - [${process.pid}] : Speech Recognition Started.`),
        err => console.log(`[HS][AZR] - [${process.pid}] : Speech Recognition Error: `, err)
    );

    // SOCKET HANDLERS
    //socket.on("data", (data) => handlePacket(socket, _transform, data));
    socket.on("data", (data) => handlePacketAzure(socket, _transform, data));

    socket.on("end", () => {
        queue.kill();
        _transform.end();

        pushStream.close();
        recognizer.stopContinuousRecognitionAsync();
        synthesizer.close();

        console.log(`[HS][AZR] - [${process.pid}] :`, util.inspect(_messages, { showHidden: false, depth: null }));
        _messages = [];

        if (fs.existsSync(fileAudio)) {
            fs.unlinkSync(fileAudio);
        }

        console.log(`[HS][AZR] - [${process.pid}] : Socket Client Disconnected: ${socket.uuid}`);
    });

    socket.on("error", (err) => {
        pushStream.close();
        recognizer.stopContinuousRecognitionAsync();
        synthesizer.close();

        console.log(`[HS][AZR] - [${process.pid}] : Socket Error: ${err.message}.`);
    });
}

module.exports = { handleSocketAzure };