const fs = require("fs");
const util = require("util");
const async = require("async");
const axios = require("axios");
const { Transform, PassThrough } = require("stream");
const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly");
const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require("@aws-sdk/client-transcribe-streaming");

const { handlePacketAzure, handleMessage } = require("../utils/packets");
const { createMessage } = require("../utils/pushstream");
const AMIService = require("../manager/amiservice");
const { appasterisk, applogger, infotransfer } = require("../config/amiconfig");

require("dotenv").config();

const polly = new PollyClient({ region: process.env.AWS_REGION, credentials: { accessKeyId: process.env.AWS_POLLY_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_POLLY_ACCESS_KEY }});
const transcribeClient = new TranscribeStreamingClient({ region: process.env.AWS_REGION, credentials: { accessKeyId: process.env.AWS_TRANSCRIPT_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_TRANSCRIPT_ACCESS_KEY }});

const ami = new AMIService(appasterisk, applogger);
ami.start();

function handleSocketAws(socket) {
    console.log("[HS] Socket Client Connected.");
    let _messages = [];
    let _runStreaming = false;
    var fileAudio = null;

    const _api = process.env.WEBHOOK_URL_BASE
        ? axios.create({ baseURL: process.env.WEBHOOK_URL_BASE })
        : null;

    const audioInputStream = new PassThrough();

    // STT: Amazon Transcribe Streaming
    const startTranscription = async () => {
        const command = new StartStreamTranscriptionCommand({
            LanguageCode: "es-US",
            MediaEncoding: "pcm",
            MediaSampleRateHertz: 16000,
            AudioStream: (async function* () {
                for await (const chunk of audioInputStream) {
                    yield { AudioEvent: { AudioChunk: chunk } };
                }
            })(),
        });

        const response = await transcribeClient.send(command);

        for await (const event of response.TranscriptResultStream) {
            if (event.TranscriptEvent) {
                const results = event.TranscriptEvent.Transcript.Results;
                for (const result of results) {
                    if (result.IsPartial === false) {
                        const transcript = result.Alternatives[0].Transcript;
                        if (transcript.trim()) {
                            _runStreaming = false;
                            handleMessage(socket.uuid, "user", transcript, _messages);
                            if (_api) {
                                try {
                                    const response = await _api.post(process.env.WEBHOOK_URL, { message: transcript });
                                    _runStreaming = true;
                                    queue.push({ message: response.data.text });
                                } catch {
                                    _runStreaming = true;
                                    queue.push({ message: "Disculpa no comprendo tu pregunta." });
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    startTranscription().catch(err => {
        console.error("[HS] Transcribe Error:", err);
    });

    // TRANSFORM
    const _transform = new Transform({
        transform(chunk, _, cb) {
            if (_runStreaming) audioInputStream.write(chunk);
            cb();
        },
    });

    // TTS: Amazon Polly
    const queue = async.queue(async ({ message }) => {
        try {
            const command = new SynthesizeSpeechCommand({
                OutputFormat: "pcm",
                Text: message,
                VoiceId: "Lucia", 
                LanguageCode: "es-ES",
                SampleRate: "8000",
            });

            const result = await polly.send(command);
            handleMessage(socket.uuid, "assistant", message, _messages);

            fileAudio = __dirname + "/../output/" + socket.uuid + ".pcm";

            const audioBuffer = await streamToBuffer(result.AudioStream);
            await fs.promises.writeFile(fileAudio, audioBuffer);

            if (message === "Transferir llamada.") {
                await ami.actionRedirect("CONEXION", socket.uuid, infotransfer.exten, infotransfer.context, infotransfer.priority);
            } else {
                const fileStream = fs.readFileSync(fileAudio);
                let offset = 0;

                while (offset < fileStream.length) {
                    if (!_runStreaming) break;

                    const sliceSize = Math.min(fileStream.length - offset, 320);
                    const slicedChunk = fileStream.subarray(offset, offset + sliceSize);
                    const buffer = createMessage(16, slicedChunk);
                    socket.write(buffer);
                    offset += sliceSize;
                    await new Promise(r => setTimeout(r, 20));
                }
            }
        } catch (error) {
            console.error("[HS] Polly TTS Error:", error);
        }
    }, 1);

    // Utilidad para convertir readable stream a buffer
    const streamToBuffer = async (stream) => {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", reject);
        });
    };

    _runStreaming = true;
    queue.push({ message: "¿En qué puedo ayudarte?" });

    // SOCKET HANDLERS
    socket.on("data", (data) => handlePacketAzure(socket, _transform, data));

    socket.on("end", () => {
        queue.kill();
        _transform.end();
        audioInputStream.end();

        if (fs.existsSync(fileAudio)) {
            fs.unlinkSync(fileAudio);
        }

        console.log(util.inspect(_messages, { showHidden: false, depth: null }));
        _messages = [];
        console.log("[HS] Socket Client Disconnected. " + socket.uuid);
    });

    socket.on("error", (err) => {
        audioInputStream.destroy();
        console.error("[HS] Socket error:", err.message);
    });
}

module.exports = { handleSocketAws };
