# Asterisk AudioSocket AI Bridge

Este proyecto es una aplicación en Node.js que permite a **Asterisk** interactuar con motores de **IA conversacional** mediante **AudioSocket**. 
Convierte la voz del usuario a texto (STT), lo envía a un webhook (por ejemplo, un agente de IA), y convierte la respuesta a voz (TTS) para ser devuelta a la llamada.

## ✨ Características

- 🔊 Interacción en tiempo real con llamadas a través de Asterisk AudioSocket.
- 🗣️ Conversión de voz a texto (Speech-to-Text).
- 💬 Envío del texto transcrito a un webhook (agente de IA, chatbot, etc.).
- 🔁 Conversión de la respuesta del webhook a voz (Text-to-Speech).
- ☁️ Soporte para motores de voz de:
  - **Google Cloud Speech-to-Text y Text-to-Speech**
  - **Microsoft Azure Speech Services**

## 🧩 Componentes principales

- **AudioSocket**: Canal de entrada/salida de audio con Asterisk.
- **Speech-to-Text (STT)**:
  - Google STT
  - Azure STT
  - Amazon AWS STT 
- **Webhook Handler**: Envía texto al endpoint de IA y espera respuesta.
- **Text-to-Speech (TTS)**:
  - Google TTS
  - Azure TTS
  - Amazon AWS TTS (Polly)
- **Audio Streamer**: Reproduce la respuesta en la llamada activa.

## ⚙️ Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/savagz/asterisk-audiosocket-ai.git
cd asterisk-audiosocket-ai
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

Crea un archivo `.env` con las siguientes variables:

```env
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=

GOOGLE_APPLICATION_CREDENTIALS=
TEXT_TO_SPEECH_LANGUAGE=
TEXT_TO_SPEECH_GENDER=
TEXT_TO_SPEECH_NAME=
SPEECH_RECOGNITION_LANGUAGE=

AWS_REGION=us-east-1
AWS_POLLY_ACCESS_KEY_ID=
AWS_POLLY_ACCESS_KEY=
AWS_TRANSCRIPT_ACCESS_KEY_ID=
AWS_TRANSCRIPT_ACCESS_KEY=

AMIHOST=
AMIUSER=
AMIPASSWD=

WEBHOOOK_URL=/webhook/
WEBHOOOK_URL_BASE=http://localhost:
WEBHOOOK_URL_PORT=3004

PROVIDER=AWS/GOOGLE/AZURE
PORT=3004
SOCKET_PORT=5001
```

### 4. Ejecutar la app

La App inicializa el cluster y el express de forma independiente

Terminal 1:
```bash
npm run start
```

Terminal 2:
```bash
node app.js
```

## 🔁 Flujo de Interacción

1. Asterisk inicia una sesión AudioSocket y conecta con esta app.
2. Se recibe el audio en tiempo real.
3. Se convierte a texto usando el proveedor configurado.
4. El texto se envía al `WEBHOOK_URL`.
5. Se recibe una respuesta de texto del agente.
6. El texto se convierte en voz.
7. La voz se transmite de vuelta por AudioSocket a la llamada.
