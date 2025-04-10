const { toUUID } = require("to-uuid");
const { encoding_for_model } = require("tiktoken");

function handlePacket(socket, _transform, _data) {
    const _bite = _data.readUInt8(0x0);
    const _bites = _data.readUInt16BE(0x1);

    switch (_bite) {
      case 0x0:
        console.log("[HP] Terminate packet received.");
        break;

      case 0x1:
        const _uuid = toUUID(_data.slice(0x3, 0x13).toString("hex"));
        socket.uuid = _uuid;
        console.log("[HP] UUID packet received: " + _uuid);
        break;

      case 0x10:
        const _finaldata = _data.slice(0x3, 0x3 + _bites);
        _transform.write(_finaldata);
        break;

      case 0xff:
        const _code = _bites > 0x0 ? _data.readUInt8(0x3) : null;
        console.log("[HP] Error packet received with code: " + _code);
        break;

      default:
        console.log("[HP] Unknown packet type: " + _bite);
    }
}

function handlePacketAzure(socket, _transform, _data) {
    const _bite = _data.readUInt8(0x0);
    const _bites = _data.readUInt16BE(0x1);

    switch (_bite) {
      case 0x0: //0
        console.log("[HP] Terminate packet received.");
        break;

      case 0x1: //1
        const _uuid = toUUID(_data.slice(0x3, 0x13).toString("hex"));
        socket.uuid = _uuid;
        console.log("[HP] UUID packet received: " + _uuid);
        break;

      case 0x10: //16
        const _finaldata = _data.slice(0x3, 0x3 + _bites);
        _transform.write(_finaldata);
        break;

      case 0xff: //255
        const _code = _bites > 0x0 ? _data.readUInt8(0x3) : null;
        //console.log("[HP] Error packet received with code: " + _code);
        break;

      default:
        console.log("[HP] Unknown packet type: " + _bite);
    }
}

function handlePacketAudio(_transform, _data) {
  const _bite = _data.readUInt8(0x0);
  const _bites = _data.readUInt16BE(0x1);

  switch (_bite) {
    case 0x0: //0
      console.log("[HP] Terminate packet received.");
      break;

    case 0x1: //1
      const _uuid = toUUID(_data.slice(0x3, 0x13).toString("hex"));
      console.log("[HP] UUID packet received: " + _uuid);
      break;

    case 0x10: //16
      const _finaldata = _data.slice(0x3, 0x3 + _bites);
      _transform.write(_finaldata);
      break;

    case 0xff: //255
      const _code = _bites > 0x0 ? _data.readUInt8(0x3) : null;
      //console.log("[HP] Error packet received with code: " + _code);
      break;

    default:
      console.log("[HP] Unknown packet type: " + _bite);
  }
}

function handleMessage(_uuid, role, content, _messages) {
    const metrics = {
      uuid: _uuid || "",
      role: role,
      content: content,
      chars: content.length,
      words: content.trim().split(/\s+/).length,
      tokens: encoding_for_model("gpt-4").encode(content).length
    };
    switch (role) {
      case "system":
        break;
      case "user":
        break;
      case "assistant":
        break;
      default:
        break;
    }
    _messages.push(metrics);
  };

module.exports = { handlePacket, handlePacketAzure, handleMessage, handlePacketAudio };