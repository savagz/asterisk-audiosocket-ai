require("dotenv").config();
const { SpeechClient } = require("@google-cloud/speech");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");

const _textToSpeech = new TextToSpeechClient();
const _speechToText = new SpeechClient();

const _voice = {
    languageCode: process.env.TEXT_TO_SPEECH_LANGUAGE || "en-AU",
    ssmlGender: process.env.TEXT_TO_SPEECH_GENDER || "FEMALE",
    name: process.env.TEXT_TO_SPEECH_NAME || "en-AU-Neural2-C"
};

const _audioConfig = {
    audioEncoding: "LINEAR16",
    sampleRateHertz: 8000,
    speakingRate: 1
};

const _streaminConfig = {
    config: {
        encoding: "LINEAR16",
        sampleRateHertz: 0x1f40,
        languageCode: process.env.SPEECH_RECOGNITION_LANGUAGE || "en-US",
        model: process.env.SPEECH_RECOGNITION_MODEL || "phone_call",
        useEnhanced: true
    },
    interimResults: false
};

module.exports = { _textToSpeech, _speechToText, _voice, _audioConfig, _streaminConfig }