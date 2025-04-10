const sdk = require('microsoft-cognitiveservices-speech-sdk');
require("dotenv").config();

// Configuración de Azure
const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    process.env.AZURE_SPEECH_REGION
);

speechConfig.speechRecognitionLanguage = 'es-ES';
speechConfig.speechSynthesisLanguage = 'es-ES';
speechConfig.speechSynthesisVoiceName = "es-CO-GonzaloNeural"; // Voz
speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff8Khz16BitMonoPcm;
speechConfig.setProperty("speech.detectSilenceTimeout", "5000");

// Configuración de audio
const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1);

module.exports = { speechConfig, audioFormat };