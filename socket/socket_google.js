const net = require("net");
const util = require("util");
const async = require("async");
const axios = require("axios");
const { Transform } = require("stream");
const { handlePacket, handleMessage } = require("../utils/packets");
const { _textToSpeech, _speechToText, _voice, _audioConfig, _streaminConfig } = require("../voice/googlecloud");

require("dotenv").config();

function handleSocketGoogle(socket) {
    console.log("[HS] Client Connected.");
    let _messages = [];
    let _runStreaming = false;
    let _assistant = false;

    // API WebHook
    const _api = process.env.WEBHOOK_URL_BASE
        ? axios.create({ baseURL: process.env.WEBHOOK_URL_BASE + process.env.WEBHOOK_URL_PORT })
        : null;

    // TRANSFORM
    const _transform = new Transform({
        transform(_chunk, _encodign, CB) {
            CB(null, _chunk);
        }
    });

    // QUEUE
    const queue = async.queue(async _task => {
        const {
            message: _message
        } = _task;

        // TEXT TO SPEECH HERE
        const _request = {
            input: {
                text: _message
            },
            voice: _voice,
            audioConfig: _audioConfig
        };

        try {
            const [_response] = await _textToSpeech.synthesizeSpeech(_request);
            handleMessage(socket.uuid, "assistant", _message, _messages);
            const _audioContent = _response.audioContent;
            for (let count = 0; count < _audioContent.length; count += 320) {
                if (!_runStreaming) {
                    break;
                }
                const _content = _audioContent.slice(count, count + 320);
                const _buffer = Buffer.alloc(3);
                _buffer.writeUInt8(16, 0);
                _buffer.writeUInt16BE(_content.length, 1);
                const _finalBuffer = Buffer.concat([_buffer, _content]);
                socket.write(_finalBuffer);
                await new Promise(executor => setTimeout(executor, 20));
            }
        } catch (_error) {
            console.error("[HS] Error synthesizing speech:", _error);
        }

    }, 1);

    queue.drain(() => { });

    // SPEECH TO TEXT HERE
    var _stream = null;
    _stream = _speechToText.streamingRecognize(_streaminConfig).on("error", console.error).on("data", async data => {
        try {
            if (data.results[0]?.["alternatives"][0]?.["transcript"] && data.results[0]?.["alternatives"][0]?.["confidence"] > 0) {
                const _transcript = data.results[0].alternatives[0].transcript.trim();
                if (_transcript) {
                    _runStreaming = false;
                    handleMessage(socket.uuid, "user", _transcript, _messages);

                    if (_api) {
                        const data = {
                            message: _transcript,
                        };

                        const headers = {
                            'Content-Type': 'application/json',
                        };

                        (async () => {
                            try {
                                const response = await _api.post(process.env.WEBHOOK_URL, data, { headers });
                                //console.log('Respuesta del servidor:', response.data);
                                _runStreaming = true;
                                queue.push({
                                    message: response.data.text
                                });
                            } catch (error) {
                                _runStreaming = true;
                                queue.push({
                                    message: "Se ha producido un error. Relajese y Disfrute"
                                });
                                //console.error('Error en la solicitud:', error.message);
                            }
                        })();
                    }
                }
            }
        } catch (_error) {
            console.error(_error);
            _assistant = false;
        }
    });

    _transform.pipe(_stream);


    // SOCKET HANDLERS

    socket.on("data", (data) => {
        handlePacket(socket, _transform, data);
    });

    socket.on("end", () => {
        queue.kill();
        _transform.end();
        if (_stream) {
            _stream.end();
        }

        console.log(util.inspect(_messages, {
            showHidden: false,
            depth: null
        }));

        _messages = [];
        _assistant = false;

        console.log("[HS] Client disconnected.");
    });

    socket.on("error", (err) => {
        _messages = [];
        console.error("[HS] Socket error: " + err.message);
    });

}

module.exports = { handleSocketGoogle };
