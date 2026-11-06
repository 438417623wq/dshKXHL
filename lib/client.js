window.__ModuleLoader__.load({
  id: "dsh-remote-link",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  RemoteLinkIcon: () => RemoteLinkIcon,
  RemoteLinkPanel: () => RemoteLinkPanel,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var React = __toESM(require("react"), 1);

// node_modules/qrcode-generator/dist/qrcode.mjs
var qrcode = function(typeNumber, errorCorrectionLevel) {
  const PAD0 = 236;
  const PAD1 = 17;
  let _typeNumber = typeNumber;
  const _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
  let _modules = null;
  let _moduleCount = 0;
  let _dataCache = null;
  const _dataList = [];
  const _this = {};
  const makeImpl = function(test, maskPattern) {
    _moduleCount = _typeNumber * 4 + 17;
    _modules = (function(moduleCount) {
      const modules = new Array(moduleCount);
      for (let row = 0; row < moduleCount; row += 1) {
        modules[row] = new Array(moduleCount);
        for (let col = 0; col < moduleCount; col += 1) {
          modules[row][col] = null;
        }
      }
      return modules;
    })(_moduleCount);
    setupPositionProbePattern(0, 0);
    setupPositionProbePattern(_moduleCount - 7, 0);
    setupPositionProbePattern(0, _moduleCount - 7);
    setupPositionAdjustPattern();
    setupTimingPattern();
    setupTypeInfo(test, maskPattern);
    if (_typeNumber >= 7) {
      setupTypeNumber(test);
    }
    if (_dataCache == null) {
      _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
    }
    mapData(_dataCache, maskPattern);
  };
  const setupPositionProbePattern = function(row, col) {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || _moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || _moduleCount <= col + c) continue;
        if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
          _modules[row + r][col + c] = true;
        } else {
          _modules[row + r][col + c] = false;
        }
      }
    }
  };
  const getBestMaskPattern = function() {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i += 1) {
      makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(_this);
      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  };
  const setupTimingPattern = function() {
    for (let r = 8; r < _moduleCount - 8; r += 1) {
      if (_modules[r][6] != null) {
        continue;
      }
      _modules[r][6] = r % 2 == 0;
    }
    for (let c = 8; c < _moduleCount - 8; c += 1) {
      if (_modules[6][c] != null) {
        continue;
      }
      _modules[6][c] = c % 2 == 0;
    }
  };
  const setupPositionAdjustPattern = function() {
    const pos = QRUtil.getPatternPosition(_typeNumber);
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {
        const row = pos[i];
        const col = pos[j];
        if (_modules[row][col] != null) {
          continue;
        }
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
              _modules[row + r][col + c] = true;
            } else {
              _modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  };
  const setupTypeNumber = function(test) {
    const bits = QRUtil.getBCHTypeNumber(_typeNumber);
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  };
  const setupTypeInfo = function(test, maskPattern) {
    const data = _errorCorrectionLevel << 3 | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      if (i < 6) {
        _modules[i][8] = mod;
      } else if (i < 8) {
        _modules[i + 1][8] = mod;
      } else {
        _modules[_moduleCount - 15 + i][8] = mod;
      }
    }
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      if (i < 8) {
        _modules[8][_moduleCount - i - 1] = mod;
      } else if (i < 9) {
        _modules[8][15 - i - 1 + 1] = mod;
      } else {
        _modules[8][15 - i - 1] = mod;
      }
    }
    _modules[_moduleCount - 8][8] = !test;
  };
  const mapData = function(data, maskPattern) {
    let inc = -1;
    let row = _moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    const maskFunc = QRUtil.getMaskFunction(maskPattern);
    for (let col = _moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col -= 1;
      while (true) {
        for (let c = 0; c < 2; c += 1) {
          if (_modules[row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (data[byteIndex] >>> bitIndex & 1) == 1;
            }
            const mask = maskFunc(row, col - c);
            if (mask) {
              dark = !dark;
            }
            _modules[row][col - c] = dark;
            bitIndex -= 1;
            if (bitIndex == -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || _moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  };
  const createBytes = function(buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r += 1) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i += 1) {
        dcdata[r][i] = 255 & buffer.getBuffer()[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i += 1) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < dcdata[r].length) {
          data[index] = dcdata[r][i];
          index += 1;
        }
      }
    }
    for (let i = 0; i < maxEcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < ecdata[r].length) {
          data[index] = ecdata[r][i];
          index += 1;
        }
      }
    }
    return data;
  };
  const createData = function(typeNumber2, errorCorrectionLevel2, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, errorCorrectionLevel2);
    const buffer = qrBitBuffer();
    for (let i = 0; i < dataList.length; i += 1) {
      const data = dataList[i];
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw "code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")";
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD1, 8);
    }
    return createBytes(buffer, rsBlocks);
  };
  _this.addData = function(data, mode) {
    mode = mode || "Byte";
    let newData = null;
    switch (mode) {
      case "Numeric":
        newData = qrNumber(data);
        break;
      case "Alphanumeric":
        newData = qrAlphaNum(data);
        break;
      case "Byte":
        newData = qr8BitByte(data);
        break;
      case "Kanji":
        newData = qrKanji(data);
        break;
      default:
        throw "mode:" + mode;
    }
    _dataList.push(newData);
    _dataCache = null;
  };
  _this.isDark = function(row, col) {
    if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
      throw row + "," + col;
    }
    return _modules[row][col];
  };
  _this.getModuleCount = function() {
    return _moduleCount;
  };
  _this.make = function() {
    if (_typeNumber < 1) {
      let typeNumber2 = 1;
      for (; typeNumber2 < 40; typeNumber2++) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, _errorCorrectionLevel);
        const buffer = qrBitBuffer();
        for (let i = 0; i < _dataList.length; i++) {
          const data = _dataList[i];
          buffer.put(data.getMode(), 4);
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
          data.write(buffer);
        }
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8) {
          break;
        }
      }
      _typeNumber = typeNumber2;
    }
    makeImpl(false, getBestMaskPattern());
  };
  _this.createTableTag = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    let qrHtml = "";
    qrHtml += '<table style="';
    qrHtml += " border-width: 0px; border-style: none;";
    qrHtml += " border-collapse: collapse;";
    qrHtml += " padding: 0px; margin: " + margin + "px;";
    qrHtml += '">';
    qrHtml += "<tbody>";
    for (let r = 0; r < _this.getModuleCount(); r += 1) {
      qrHtml += "<tr>";
      for (let c = 0; c < _this.getModuleCount(); c += 1) {
        qrHtml += '<td style="';
        qrHtml += " border-width: 0px; border-style: none;";
        qrHtml += " border-collapse: collapse;";
        qrHtml += " padding: 0px; margin: 0px;";
        qrHtml += " width: " + cellSize + "px;";
        qrHtml += " height: " + cellSize + "px;";
        qrHtml += " background-color: ";
        qrHtml += _this.isDark(r, c) ? "#000000" : "#ffffff";
        qrHtml += ";";
        qrHtml += '"/>';
      }
      qrHtml += "</tr>";
    }
    qrHtml += "</tbody>";
    qrHtml += "</table>";
    return qrHtml;
  };
  _this.createSvgTag = function(cellSize, margin, alt, title) {
    let opts = {};
    if (typeof arguments[0] == "object") {
      opts = arguments[0];
      cellSize = opts.cellSize;
      margin = opts.margin;
      alt = opts.alt;
      title = opts.title;
    }
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    alt = typeof alt === "string" ? { text: alt } : alt || {};
    alt.text = alt.text || null;
    alt.id = alt.text ? alt.id || "qrcode-description" : null;
    title = typeof title === "string" ? { text: title } : title || {};
    title.text = title.text || null;
    title.id = title.text ? title.id || "qrcode-title" : null;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    let c, mc, r, mr, qrSvg = "", rect;
    rect = "l" + cellSize + ",0 0," + cellSize + " -" + cellSize + ",0 0,-" + cellSize + "z ";
    qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
    qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : "";
    qrSvg += ' viewBox="0 0 ' + size + " " + size + '" ';
    qrSvg += ' preserveAspectRatio="xMinYMin meet"';
    qrSvg += title.text || alt.text ? ' role="img" aria-labelledby="' + escapeXml([title.id, alt.id].join(" ").trim()) + '"' : "";
    qrSvg += ">";
    qrSvg += title.text ? '<title id="' + escapeXml(title.id) + '">' + escapeXml(title.text) + "</title>" : "";
    qrSvg += alt.text ? '<description id="' + escapeXml(alt.id) + '">' + escapeXml(alt.text) + "</description>" : "";
    qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
    qrSvg += '<path d="';
    for (r = 0; r < _this.getModuleCount(); r += 1) {
      mr = r * cellSize + margin;
      for (c = 0; c < _this.getModuleCount(); c += 1) {
        if (_this.isDark(r, c)) {
          mc = c * cellSize + margin;
          qrSvg += "M" + mc + "," + mr + rect;
        }
      }
    }
    qrSvg += '" stroke="transparent" fill="black"/>';
    qrSvg += "</svg>";
    return qrSvg;
  };
  _this.createDataURL = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    return createDataURL(size, size, function(x, y) {
      if (min <= x && x < max && min <= y && y < max) {
        const c = Math.floor((x - min) / cellSize);
        const r = Math.floor((y - min) / cellSize);
        return _this.isDark(r, c) ? 0 : 1;
      } else {
        return 1;
      }
    });
  };
  _this.createImgTag = function(cellSize, margin, alt) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    let img = "";
    img += "<img";
    img += ' src="';
    img += _this.createDataURL(cellSize, margin);
    img += '"';
    img += ' width="';
    img += size;
    img += '"';
    img += ' height="';
    img += size;
    img += '"';
    if (alt) {
      img += ' alt="';
      img += escapeXml(alt);
      img += '"';
    }
    img += "/>";
    return img;
  };
  const escapeXml = function(s) {
    let escaped = "";
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charAt(i);
      switch (c) {
        case "<":
          escaped += "&lt;";
          break;
        case ">":
          escaped += "&gt;";
          break;
        case "&":
          escaped += "&amp;";
          break;
        case '"':
          escaped += "&quot;";
          break;
        default:
          escaped += c;
          break;
      }
    }
    return escaped;
  };
  const _createHalfASCII = function(margin) {
    const cellSize = 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    let y, x, r1, r2, p;
    const blocks = {
      "██": "█",
      "█ ": "▀",
      " █": "▄",
      "  ": " "
    };
    const blocksLastLineNoMargin = {
      "██": "▀",
      "█ ": "▀",
      " █": " ",
      "  ": " "
    };
    let ascii = "";
    for (y = 0; y < size; y += 2) {
      r1 = Math.floor((y - min) / cellSize);
      r2 = Math.floor((y + 1 - min) / cellSize);
      for (x = 0; x < size; x += 1) {
        p = "█";
        if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
          p = " ";
        }
        if (min <= x && x < max && min <= y + 1 && y + 1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
          p += " ";
        } else {
          p += "█";
        }
        ascii += margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
      }
      ascii += "\n";
    }
    if (size % 2 && margin > 0) {
      return ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("▀");
    }
    return ascii.substring(0, ascii.length - 1);
  };
  _this.createASCII = function(cellSize, margin) {
    cellSize = cellSize || 1;
    if (cellSize < 2) {
      return _createHalfASCII(margin);
    }
    cellSize -= 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    let y, x, r, p;
    const white = Array(cellSize + 1).join("██");
    const black = Array(cellSize + 1).join("  ");
    let ascii = "";
    let line = "";
    for (y = 0; y < size; y += 1) {
      r = Math.floor((y - min) / cellSize);
      line = "";
      for (x = 0; x < size; x += 1) {
        p = 1;
        if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
          p = 0;
        }
        line += p ? white : black;
      }
      for (r = 0; r < cellSize; r += 1) {
        ascii += line + "\n";
      }
    }
    return ascii.substring(0, ascii.length - 1);
  };
  _this.renderTo2dContext = function(context, cellSize) {
    cellSize = cellSize || 2;
    const length = _this.getModuleCount();
    for (let row = 0; row < length; row++) {
      for (let col = 0; col < length; col++) {
        context.fillStyle = _this.isDark(row, col) ? "black" : "white";
        context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  };
  return _this;
};
qrcode.stringToBytes = function(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    bytes.push(c & 255);
  }
  return bytes;
};
qrcode.createStringToBytes = function(unicodeData, numChars) {
  const unicodeMap = (function() {
    const bin = base64DecodeInputStream(unicodeData);
    const read = function() {
      const b = bin.read();
      if (b == -1) throw "eof";
      return b;
    };
    let count = 0;
    const unicodeMap2 = {};
    while (true) {
      const b0 = bin.read();
      if (b0 == -1) break;
      const b1 = read();
      const b2 = read();
      const b3 = read();
      const k = String.fromCharCode(b0 << 8 | b1);
      const v = b2 << 8 | b3;
      unicodeMap2[k] = v;
      count += 1;
    }
    if (count != numChars) {
      throw count + " != " + numChars;
    }
    return unicodeMap2;
  })();
  const unknownChar = "?".charCodeAt(0);
  return function(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else {
        const b = unicodeMap[s.charAt(i)];
        if (typeof b == "number") {
          if ((b & 255) == b) {
            bytes.push(b);
          } else {
            bytes.push(b >>> 8);
            bytes.push(b & 255);
          }
        } else {
          bytes.push(unknownChar);
        }
      }
    }
    return bytes;
  };
};
var QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3
};
var QRErrorCorrectionLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2
};
var QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7
};
var QRUtil = (function() {
  const PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170]
  ];
  const G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
  const G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
  const G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
  const _this = {};
  const getBCHDigit = function(data) {
    let digit = 0;
    while (data != 0) {
      digit += 1;
      data >>>= 1;
    }
    return digit;
  };
  _this.getBCHTypeInfo = function(data) {
    let d = data << 10;
    while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
      d ^= G15 << getBCHDigit(d) - getBCHDigit(G15);
    }
    return (data << 10 | d) ^ G15_MASK;
  };
  _this.getBCHTypeNumber = function(data) {
    let d = data << 12;
    while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
      d ^= G18 << getBCHDigit(d) - getBCHDigit(G18);
    }
    return data << 12 | d;
  };
  _this.getPatternPosition = function(typeNumber) {
    return PATTERN_POSITION_TABLE[typeNumber - 1];
  };
  _this.getMaskFunction = function(maskPattern) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return function(i, j) {
          return (i + j) % 2 == 0;
        };
      case QRMaskPattern.PATTERN001:
        return function(i, j) {
          return i % 2 == 0;
        };
      case QRMaskPattern.PATTERN010:
        return function(i, j) {
          return j % 3 == 0;
        };
      case QRMaskPattern.PATTERN011:
        return function(i, j) {
          return (i + j) % 3 == 0;
        };
      case QRMaskPattern.PATTERN100:
        return function(i, j) {
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
        };
      case QRMaskPattern.PATTERN101:
        return function(i, j) {
          return i * j % 2 + i * j % 3 == 0;
        };
      case QRMaskPattern.PATTERN110:
        return function(i, j) {
          return (i * j % 2 + i * j % 3) % 2 == 0;
        };
      case QRMaskPattern.PATTERN111:
        return function(i, j) {
          return (i * j % 3 + (i + j) % 2) % 2 == 0;
        };
      default:
        throw "bad maskPattern:" + maskPattern;
    }
  };
  _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
    let a = qrPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i += 1) {
      a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  };
  _this.getLengthInBits = function(mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10;
        case QRMode.MODE_ALPHA_NUM:
          return 9;
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        case QRMode.MODE_KANJI:
          return 8;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12;
        case QRMode.MODE_ALPHA_NUM:
          return 11;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 10;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 41) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14;
        case QRMode.MODE_ALPHA_NUM:
          return 13;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 12;
        default:
          throw "mode:" + mode;
      }
    } else {
      throw "type:" + type;
    }
  };
  _this.getLostPoint = function(qrcode2) {
    const moduleCount = qrcode2.getModuleCount();
    let lostPoint = 0;
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        let sameCount = 0;
        const dark = qrcode2.isDark(row, col);
        for (let r = -1; r <= 1; r += 1) {
          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }
          for (let c = -1; c <= 1; c += 1) {
            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }
            if (r == 0 && c == 0) {
              continue;
            }
            if (dark == qrcode2.isDark(row + r, col + c)) {
              sameCount += 1;
            }
          }
        }
        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }
    ;
    for (let row = 0; row < moduleCount - 1; row += 1) {
      for (let col = 0; col < moduleCount - 1; col += 1) {
        let count = 0;
        if (qrcode2.isDark(row, col)) count += 1;
        if (qrcode2.isDark(row + 1, col)) count += 1;
        if (qrcode2.isDark(row, col + 1)) count += 1;
        if (qrcode2.isDark(row + 1, col + 1)) count += 1;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount - 6; col += 1) {
        if (qrcode2.isDark(row, col) && !qrcode2.isDark(row, col + 1) && qrcode2.isDark(row, col + 2) && qrcode2.isDark(row, col + 3) && qrcode2.isDark(row, col + 4) && !qrcode2.isDark(row, col + 5) && qrcode2.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount - 6; row += 1) {
        if (qrcode2.isDark(row, col) && !qrcode2.isDark(row + 1, col) && qrcode2.isDark(row + 2, col) && qrcode2.isDark(row + 3, col) && qrcode2.isDark(row + 4, col) && !qrcode2.isDark(row + 5, col) && qrcode2.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount; row += 1) {
        if (qrcode2.isDark(row, col)) {
          darkCount += 1;
        }
      }
    }
    const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  };
  return _this;
})();
var QRMath = (function() {
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  for (let i = 0; i < 8; i += 1) {
    EXP_TABLE[i] = 1 << i;
  }
  for (let i = 8; i < 256; i += 1) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i += 1) {
    LOG_TABLE[EXP_TABLE[i]] = i;
  }
  const _this = {};
  _this.glog = function(n) {
    if (n < 1) {
      throw "glog(" + n + ")";
    }
    return LOG_TABLE[n];
  };
  _this.gexp = function(n) {
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return EXP_TABLE[n];
  };
  return _this;
})();
var qrPolynomial = function(num, shift) {
  if (typeof num.length == "undefined") {
    throw num.length + "/" + shift;
  }
  const _num = (function() {
    let offset = 0;
    while (offset < num.length && num[offset] == 0) {
      offset += 1;
    }
    const _num2 = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i += 1) {
      _num2[i] = num[i + offset];
    }
    return _num2;
  })();
  const _this = {};
  _this.getAt = function(index) {
    return _num[index];
  };
  _this.getLength = function() {
    return _num.length;
  };
  _this.multiply = function(e) {
    const num2 = new Array(_this.getLength() + e.getLength() - 1);
    for (let i = 0; i < _this.getLength(); i += 1) {
      for (let j = 0; j < e.getLength(); j += 1) {
        num2[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
      }
    }
    return qrPolynomial(num2, 0);
  };
  _this.mod = function(e) {
    if (_this.getLength() - e.getLength() < 0) {
      return _this;
    }
    const ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));
    const num2 = new Array(_this.getLength());
    for (let i = 0; i < _this.getLength(); i += 1) {
      num2[i] = _this.getAt(i);
    }
    for (let i = 0; i < e.getLength(); i += 1) {
      num2[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
    }
    return qrPolynomial(num2, 0).mod(e);
  };
  return _this;
};
var QRRSBlock = (function() {
  const RS_BLOCK_TABLE = [
    // L
    // M
    // Q
    // H
    // 1
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    // 2
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    // 3
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    // 4
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    // 5
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    // 6
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    // 7
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    // 8
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    // 9
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    // 10
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    // 11
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    // 12
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    // 13
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    // 14
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    // 15
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    // 16
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    // 17
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    // 18
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    // 19
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    // 20
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    // 21
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    // 22
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    // 23
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    // 24
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    // 25
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    // 26
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    // 27
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    // 28
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    // 29
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    // 30
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    // 31
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    // 32
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    // 33
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    // 34
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    // 35
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    // 36
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    // 37
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    // 38
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    // 39
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    // 40
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16]
  ];
  const qrRSBlock = function(totalCount, dataCount) {
    const _this2 = {};
    _this2.totalCount = totalCount;
    _this2.dataCount = dataCount;
    return _this2;
  };
  const _this = {};
  const getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return void 0;
    }
  };
  _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
    const rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (typeof rsBlock == "undefined") {
      throw "bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel;
    }
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; i += 1) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j += 1) {
        list.push(qrRSBlock(totalCount, dataCount));
      }
    }
    return list;
  };
  return _this;
})();
var qrBitBuffer = function() {
  const _buffer = [];
  let _length = 0;
  const _this = {};
  _this.getBuffer = function() {
    return _buffer;
  };
  _this.getAt = function(index) {
    const bufIndex = Math.floor(index / 8);
    return (_buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
  };
  _this.put = function(num, length) {
    for (let i = 0; i < length; i += 1) {
      _this.putBit((num >>> length - i - 1 & 1) == 1);
    }
  };
  _this.getLengthInBits = function() {
    return _length;
  };
  _this.putBit = function(bit) {
    const bufIndex = Math.floor(_length / 8);
    if (_buffer.length <= bufIndex) {
      _buffer.push(0);
    }
    if (bit) {
      _buffer[bufIndex] |= 128 >>> _length % 8;
    }
    _length += 1;
  };
  return _this;
};
var qrNumber = function(data) {
  const _mode = QRMode.MODE_NUMBER;
  const _data = data;
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _data.length;
  };
  _this.write = function(buffer) {
    const data2 = _data;
    let i = 0;
    while (i + 2 < data2.length) {
      buffer.put(strToNum(data2.substring(i, i + 3)), 10);
      i += 3;
    }
    if (i < data2.length) {
      if (data2.length - i == 1) {
        buffer.put(strToNum(data2.substring(i, i + 1)), 4);
      } else if (data2.length - i == 2) {
        buffer.put(strToNum(data2.substring(i, i + 2)), 7);
      }
    }
  };
  const strToNum = function(s) {
    let num = 0;
    for (let i = 0; i < s.length; i += 1) {
      num = num * 10 + chatToNum(s.charAt(i));
    }
    return num;
  };
  const chatToNum = function(c) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    }
    throw "illegal char :" + c;
  };
  return _this;
};
var qrAlphaNum = function(data) {
  const _mode = QRMode.MODE_ALPHA_NUM;
  const _data = data;
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _data.length;
  };
  _this.write = function(buffer) {
    const s = _data;
    let i = 0;
    while (i + 1 < s.length) {
      buffer.put(
        getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)),
        11
      );
      i += 2;
    }
    if (i < s.length) {
      buffer.put(getCode(s.charAt(i)), 6);
    }
  };
  const getCode = function(c) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    } else if ("A" <= c && c <= "Z") {
      return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
    } else {
      switch (c) {
        case " ":
          return 36;
        case "$":
          return 37;
        case "%":
          return 38;
        case "*":
          return 39;
        case "+":
          return 40;
        case "-":
          return 41;
        case ".":
          return 42;
        case "/":
          return 43;
        case ":":
          return 44;
        default:
          throw "illegal char :" + c;
      }
    }
  };
  return _this;
};
var qr8BitByte = function(data) {
  const _mode = QRMode.MODE_8BIT_BYTE;
  const _data = data;
  const _bytes = qrcode.stringToBytes(data);
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _bytes.length;
  };
  _this.write = function(buffer) {
    for (let i = 0; i < _bytes.length; i += 1) {
      buffer.put(_bytes[i], 8);
    }
  };
  return _this;
};
var qrKanji = function(data) {
  const _mode = QRMode.MODE_KANJI;
  const _data = data;
  const stringToBytes2 = qrcode.stringToBytes;
  !(function(c, code) {
    const test = stringToBytes2(c);
    if (test.length != 2 || (test[0] << 8 | test[1]) != code) {
      throw "sjis not supported.";
    }
  })("友", 38726);
  const _bytes = stringToBytes2(data);
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return ~~(_bytes.length / 2);
  };
  _this.write = function(buffer) {
    const data2 = _bytes;
    let i = 0;
    while (i + 1 < data2.length) {
      let c = (255 & data2[i]) << 8 | 255 & data2[i + 1];
      if (33088 <= c && c <= 40956) {
        c -= 33088;
      } else if (57408 <= c && c <= 60351) {
        c -= 49472;
      } else {
        throw "illegal char at " + (i + 1) + "/" + c;
      }
      c = (c >>> 8 & 255) * 192 + (c & 255);
      buffer.put(c, 13);
      i += 2;
    }
    if (i < data2.length) {
      throw "illegal char at " + (i + 1);
    }
  };
  return _this;
};
var byteArrayOutputStream = function() {
  const _bytes = [];
  const _this = {};
  _this.writeByte = function(b) {
    _bytes.push(b & 255);
  };
  _this.writeShort = function(i) {
    _this.writeByte(i);
    _this.writeByte(i >>> 8);
  };
  _this.writeBytes = function(b, off, len) {
    off = off || 0;
    len = len || b.length;
    for (let i = 0; i < len; i += 1) {
      _this.writeByte(b[i + off]);
    }
  };
  _this.writeString = function(s) {
    for (let i = 0; i < s.length; i += 1) {
      _this.writeByte(s.charCodeAt(i));
    }
  };
  _this.toByteArray = function() {
    return _bytes;
  };
  _this.toString = function() {
    let s = "";
    s += "[";
    for (let i = 0; i < _bytes.length; i += 1) {
      if (i > 0) {
        s += ",";
      }
      s += _bytes[i];
    }
    s += "]";
    return s;
  };
  return _this;
};
var base64EncodeOutputStream = function() {
  let _buffer = 0;
  let _buflen = 0;
  let _length = 0;
  let _base64 = "";
  const _this = {};
  const writeEncoded = function(b) {
    _base64 += String.fromCharCode(encode(b & 63));
  };
  const encode = function(n) {
    if (n < 0) {
      throw "n:" + n;
    } else if (n < 26) {
      return 65 + n;
    } else if (n < 52) {
      return 97 + (n - 26);
    } else if (n < 62) {
      return 48 + (n - 52);
    } else if (n == 62) {
      return 43;
    } else if (n == 63) {
      return 47;
    } else {
      throw "n:" + n;
    }
  };
  _this.writeByte = function(n) {
    _buffer = _buffer << 8 | n & 255;
    _buflen += 8;
    _length += 1;
    while (_buflen >= 6) {
      writeEncoded(_buffer >>> _buflen - 6);
      _buflen -= 6;
    }
  };
  _this.flush = function() {
    if (_buflen > 0) {
      writeEncoded(_buffer << 6 - _buflen);
      _buffer = 0;
      _buflen = 0;
    }
    if (_length % 3 != 0) {
      const padlen = 3 - _length % 3;
      for (let i = 0; i < padlen; i += 1) {
        _base64 += "=";
      }
    }
  };
  _this.toString = function() {
    return _base64;
  };
  return _this;
};
var base64DecodeInputStream = function(str) {
  const _str = str;
  let _pos = 0;
  let _buffer = 0;
  let _buflen = 0;
  const _this = {};
  _this.read = function() {
    while (_buflen < 8) {
      if (_pos >= _str.length) {
        if (_buflen == 0) {
          return -1;
        }
        throw "unexpected end of file./" + _buflen;
      }
      const c = _str.charAt(_pos);
      _pos += 1;
      if (c == "=") {
        _buflen = 0;
        return -1;
      } else if (c.match(/^\s$/)) {
        continue;
      }
      _buffer = _buffer << 6 | decode(c.charCodeAt(0));
      _buflen += 6;
    }
    const n = _buffer >>> _buflen - 8 & 255;
    _buflen -= 8;
    return n;
  };
  const decode = function(c) {
    if (65 <= c && c <= 90) {
      return c - 65;
    } else if (97 <= c && c <= 122) {
      return c - 97 + 26;
    } else if (48 <= c && c <= 57) {
      return c - 48 + 52;
    } else if (c == 43) {
      return 62;
    } else if (c == 47) {
      return 63;
    } else {
      throw "c:" + c;
    }
  };
  return _this;
};
var gifImage = function(width, height) {
  const _width = width;
  const _height = height;
  const _data = new Array(width * height);
  const _this = {};
  _this.setPixel = function(x, y, pixel) {
    _data[y * _width + x] = pixel;
  };
  _this.write = function(out) {
    out.writeString("GIF87a");
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(128);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(255);
    out.writeByte(255);
    out.writeByte(255);
    out.writeString(",");
    out.writeShort(0);
    out.writeShort(0);
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(0);
    const lzwMinCodeSize = 2;
    const raster = getLZWRaster(lzwMinCodeSize);
    out.writeByte(lzwMinCodeSize);
    let offset = 0;
    while (raster.length - offset > 255) {
      out.writeByte(255);
      out.writeBytes(raster, offset, 255);
      offset += 255;
    }
    out.writeByte(raster.length - offset);
    out.writeBytes(raster, offset, raster.length - offset);
    out.writeByte(0);
    out.writeString(";");
  };
  const bitOutputStream = function(out) {
    const _out = out;
    let _bitLength = 0;
    let _bitBuffer = 0;
    const _this2 = {};
    _this2.write = function(data, length) {
      if (data >>> length != 0) {
        throw "length over";
      }
      while (_bitLength + length >= 8) {
        _out.writeByte(255 & (data << _bitLength | _bitBuffer));
        length -= 8 - _bitLength;
        data >>>= 8 - _bitLength;
        _bitBuffer = 0;
        _bitLength = 0;
      }
      _bitBuffer = data << _bitLength | _bitBuffer;
      _bitLength = _bitLength + length;
    };
    _this2.flush = function() {
      if (_bitLength > 0) {
        _out.writeByte(_bitBuffer);
      }
    };
    return _this2;
  };
  const getLZWRaster = function(lzwMinCodeSize) {
    const clearCode = 1 << lzwMinCodeSize;
    const endCode = (1 << lzwMinCodeSize) + 1;
    let bitLength = lzwMinCodeSize + 1;
    const table = lzwTable();
    for (let i = 0; i < clearCode; i += 1) {
      table.add(String.fromCharCode(i));
    }
    table.add(String.fromCharCode(clearCode));
    table.add(String.fromCharCode(endCode));
    const byteOut = byteArrayOutputStream();
    const bitOut = bitOutputStream(byteOut);
    bitOut.write(clearCode, bitLength);
    let dataIndex = 0;
    let s = String.fromCharCode(_data[dataIndex]);
    dataIndex += 1;
    while (dataIndex < _data.length) {
      const c = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;
      if (table.contains(s + c)) {
        s = s + c;
      } else {
        bitOut.write(table.indexOf(s), bitLength);
        if (table.size() < 4095) {
          if (table.size() == 1 << bitLength) {
            bitLength += 1;
          }
          table.add(s + c);
        }
        s = c;
      }
    }
    bitOut.write(table.indexOf(s), bitLength);
    bitOut.write(endCode, bitLength);
    bitOut.flush();
    return byteOut.toByteArray();
  };
  const lzwTable = function() {
    const _map = {};
    let _size = 0;
    const _this2 = {};
    _this2.add = function(key) {
      if (_this2.contains(key)) {
        throw "dup key:" + key;
      }
      _map[key] = _size;
      _size += 1;
    };
    _this2.size = function() {
      return _size;
    };
    _this2.indexOf = function(key) {
      return _map[key];
    };
    _this2.contains = function(key) {
      return typeof _map[key] != "undefined";
    };
    return _this2;
  };
  return _this;
};
var createDataURL = function(width, height, getPixel) {
  const gif = gifImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      gif.setPixel(x, y, getPixel(x, y));
    }
  }
  const b = byteArrayOutputStream();
  gif.write(b);
  const base64 = base64EncodeOutputStream();
  const bytes = b.toByteArray();
  for (let i = 0; i < bytes.length; i += 1) {
    base64.writeByte(bytes[i]);
  }
  base64.flush();
  return "data:image/gif;base64," + base64;
};
var qrcode_default = qrcode;
var stringToBytes = qrcode.stringToBytes;

// src/client/qr.js
function qrPath(text) {
  try {
    const qr = qrcode_default(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return d;
  } catch {
    return "";
  }
}
function qrSize(text) {
  try {
    const qr = qrcode_default(0, "M");
    qr.addData(text);
    qr.make();
    return qr.getModuleCount();
  } catch {
    return 25;
  }
}

// src/client/styles.js
var STYLE_ID = "dsh-remote-link-styles";
var CSS = `
.dshrl-root {
  height: 100%;
  overflow: auto;
  padding: 22px 24px 40px;
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary, #e8e8ea);
  font-size: 13.5px;
  line-height: 1.55;
}

.dshrl-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}
.dshrl-head-main { flex: 1; min-width: 0; }
.dshrl-title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: .2px;
}
.dshrl-sub {
  margin: 4px 0 0;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  font-size: 12.5px;
}

.dshrl-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  background: var(--dsw-alias-bg-layer-2, #202024);
  font-size: 12.5px;
  white-space: nowrap;
}
.dshrl-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, #8b8b93);
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 12%, transparent);
}
.dshrl-dot.is-on {
  background: var(--dsw-alias-state-success-primary, #37c26a);
  animation: dshrl-pulse 2.4s ease-in-out infinite;
}
.dshrl-dot.is-off { background: var(--dsw-alias-label-tertiary, #8b8b93); }
.dshrl-dot.is-err { background: var(--dsw-alias-state-error-primary, #e5484d); }
@keyframes dshrl-pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: .45 }
}

.dshrl-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
@media (max-width: 900px) {
  .dshrl-grid { grid-template-columns: minmax(0, 1fr); }
}

.dshrl-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.dshrl-card {
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-2, #202024);
  padding: 16px 16px 15px;
  min-width: 0;
}
.dshrl-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.dshrl-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary, #b9b9c0);
  letter-spacing: .3px;
}
.dshrl-card-hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
}

.dshrl-power {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.dshrl-power-text { flex: 1; min-width: 150px; }
.dshrl-power-title { font-size: 15px; font-weight: 600; }
.dshrl-power-desc {
  margin-top: 3px;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  word-break: break-all;
}

.dshrl-btn {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-secondary, #3d3d46);
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  color: var(--dsw-alias-label-primary, #e8e8ea);
  border-radius: 9px;
  padding: 8px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background .14s, border-color .14s, opacity .14s;
  white-space: nowrap;
}
.dshrl-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #34343c); }
.dshrl-btn:disabled { opacity: .5; cursor: default; }
.dshrl-btn-primary {
  background: var(--dsw-alias-brand-primary, #4d6bfe);
  border-color: transparent;
  color: #fff;
  font-weight: 500;
}
.dshrl-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.dshrl-btn-danger { color: var(--dsw-alias-state-error-primary, #e5484d); }
.dshrl-btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 7px; }
.dshrl-btn-ghost { background: none; border-color: transparent; color: var(--dsw-alias-link, #7aa2ff); }

.dshrl-code {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.dshrl-code-big {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 27px;
  font-weight: 600;
  letter-spacing: 3px;
  color: var(--dsw-alias-label-primary, #fff);
}
.dshrl-code-big.is-muted { color: var(--dsw-alias-label-tertiary, #8b8b93); font-size: 15px; letter-spacing: 0; }

.dshrl-link {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-1, #17171a);
  padding: 8px 10px;
}
.dshrl-link-text {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary, #b9b9c0);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dshrl-qr {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: #fff;
  border-radius: 12px;
  margin: 0 auto 12px;
  width: max-content;
  max-width: 100%;
}
.dshrl-qr svg { display: block; width: 176px; height: 176px; }
.dshrl-qr-empty {
  height: 176px;
  display: grid;
  place-items: center;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  font-size: 12.5px;
  text-align: center;
  padding: 0 20px;
}

.dshrl-rows { display: flex; flex-direction: column; }
.dshrl-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid var(--dsw-alias-border-l2, #33333a);
  min-width: 0;
}
.dshrl-row:first-child { border-top: none; }
.dshrl-row-label { color: var(--dsw-alias-label-tertiary, #8b8b93); font-size: 12.5px; flex: none; }
.dshrl-row-value {
  margin-left: auto;
  color: var(--dsw-alias-label-secondary, #b9b9c0);
  font-size: 12.5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshrl-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshrl-ok { color: var(--dsw-alias-state-success-primary, #37c26a); }
.dshrl-bad { color: var(--dsw-alias-state-error-primary, #e5484d); }
.dshrl-warn { color: var(--dsw-alias-state-warn-primary, #e0a13a); }

.dshrl-device {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid var(--dsw-alias-border-l2, #33333a);
  min-width: 0;
}
.dshrl-device:first-child { border-top: none; }
.dshrl-device-main { min-width: 0; flex: 1; }
.dshrl-device-ip { font-size: 13px; font-weight: 500; }
.dshrl-device-meta {
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshrl-badge {
  flex: none;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  color: var(--dsw-alias-label-secondary, #b9b9c0);
}
.dshrl-badge.is-live {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #37c26a) 18%, transparent);
  color: var(--dsw-alias-state-success-primary, #37c26a);
}

/* 外网通道的三种状态。用颜色区分「可用 / 未就绪 / 未安装」——
   文字标签本身已经说清了，颜色只是让眼睛先扫到哪条能点。 */
.dshrl-badge.is-ok {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #37c26a) 18%, transparent);
  color: var(--dsw-alias-state-success-primary, #37c26a);
}
.dshrl-badge.is-warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warning-primary, #f5a623) 18%, transparent);
  color: var(--dsw-alias-state-warning-primary, #f5a623);
}
.dshrl-badge.is-off {
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  color: var(--dsw-alias-label-tertiary, #8b8b93);
}

.dshrl-tuns {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dshrl-tun {
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, #17171a);
  padding: 10px 12px;
}
.dshrl-tun-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dshrl-tun-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #fff);
}
/* 卡片里已经有边框了，里面这条地址不能再叠一层视觉重量 */
.dshrl-tun .dshrl-link {
  margin-top: 8px;
  background: var(--dsw-alias-bg-layer-2, #1f1f24);
}
.dshrl-tun .dshrl-sub {
  margin-top: 8px;
}

.dshrl-empty {
  padding: 18px 0 8px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  font-size: 12.5px;
}

.dshrl-field { display: flex; gap: 8px; align-items: center; }
.dshrl-input {
  flex: 1;
  min-width: 0;
  appearance: none;
  background: var(--dsw-alias-bg-layer-1, #17171a);
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 8px;
  color: var(--dsw-alias-label-primary, #e8e8ea);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  padding: 7px 9px;
  outline: none;
}
.dshrl-input:focus { border-color: var(--dsw-alias-brand-primary, #4d6bfe); }

.dshrl-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0 0;
  border-top: 1px solid var(--dsw-alias-border-l2, #33333a);
  margin-top: 10px;
}
.dshrl-switch-text { flex: 1; min-width: 0; }
.dshrl-switch-desc { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #8b8b93); }
.dshrl-toggle {
  position: relative;
  flex: none;
  width: 40px; height: 22px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-secondary, #3d3d46);
  background: var(--dsw-alias-bg-layer-1, #17171a);
  cursor: pointer;
  transition: background .16s, border-color .16s;
  padding: 0;
}
.dshrl-toggle::after {
  content: '';
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, #8b8b93);
  transition: transform .16s, background .16s;
}
.dshrl-toggle.is-on {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 30%, transparent);
  border-color: var(--dsw-alias-brand-primary, #4d6bfe);
}
.dshrl-toggle.is-on::after {
  transform: translateX(18px);
  background: var(--dsw-alias-brand-primary, #4d6bfe);
}

.dshrl-steps { margin: 0; padding: 0; list-style: none; counter-reset: s; }
.dshrl-steps li {
  position: relative;
  counter-increment: s;
  padding: 0 0 12px 30px;
  font-size: 12.5px;
  color: var(--dsw-alias-label-secondary, #b9b9c0);
}
.dshrl-steps li:last-child { padding-bottom: 0; }
.dshrl-steps li::before {
  content: counter(s);
  position: absolute;
  left: 0; top: 1px;
  width: 19px; height: 19px;
  border-radius: 50%;
  display: grid; place-items: center;
  font-size: 11px;
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  color: var(--dsw-alias-label-secondary, #b9b9c0);
}
.dshrl-steps code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  background: var(--dsw-alias-bg-layer-1, #17171a);
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 5px;
  padding: 1px 5px;
}

.dshrl-events { display: flex; flex-direction: column; gap: 7px; max-height: 210px; overflow: auto; }
.dshrl-event { display: flex; gap: 8px; font-size: 11.5px; min-width: 0; }
.dshrl-event-time { flex: none; color: var(--dsw-alias-label-tertiary, #8b8b93); font-family: ui-monospace, monospace; }
.dshrl-event-text { min-width: 0; word-break: break-word; color: var(--dsw-alias-label-secondary, #b9b9c0); }

.dshrl-banner {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 34%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 10%, transparent);
  font-size: 12.5px;
  color: var(--dsw-alias-label-primary, #e8e8ea);
}
.dshrl-banner-warn {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a13a) 34%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a13a) 10%, transparent);
}

.dshrl-toast {
  position: fixed;
  left: 50%;
  bottom: 30px;
  transform: translateX(-50%);
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  border: 1px solid var(--dsw-alias-border-secondary, #3d3d46);
  color: var(--dsw-alias-label-primary, #e8e8ea);
  border-radius: 9px;
  padding: 9px 16px;
  font-size: 12.5px;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .28);
}
`;
function installStyles() {
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.dataset.dshRemoteLink = "1";
  el.textContent = CSS;
  document.head.appendChild(el);
  return () => {
    el.remove();
  };
}

// src/client/index.js
var h = React.createElement;
var PANEL_ID = "remote-link";
var SIDEBAR_ORDER = 900;
var div = (cls, ...kids) => h("div", { className: cls }, ...kids);
var span = (cls, ...kids) => h("span", { className: cls }, ...kids);
function btn(cls, props, ...kids) {
  return h("button", { type: "button", className: cls, ...props }, ...kids);
}
function tunnelRow(t, onCopy) {
  const badge = t.ready ? "可用" : t.installed ? "未就绪" : "未安装";
  const badgeCls = t.ready ? "is-ok" : t.installed ? "is-warn" : "is-off";
  return h(
    "div",
    { className: "dshrl-tun", key: t.kind },
    h(
      "div",
      { className: "dshrl-tun-head" },
      span("dshrl-tun-name", t.label),
      span(`dshrl-badge ${badgeCls}`, badge)
    ),
    t.url ? h(
      "div",
      { className: "dshrl-link" },
      span("dshrl-link-text", t.url),
      btn("dshrl-btn dshrl-btn-sm", { onClick: () => onCopy(t.url) }, "复制")
    ) : null,
    t.command ? h(
      "div",
      { className: "dshrl-link" },
      span("dshrl-link-text", t.command),
      btn("dshrl-btn dshrl-btn-sm", { onClick: () => onCopy(t.command) }, "复制")
    ) : null,
    h("div", { className: "dshrl-sub" }, t.hint)
  );
}
function ago(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 15e3) return "刚刚";
  if (diff < 6e4) return `${Math.floor(diff / 1e3)} 秒前`;
  if (diff < 36e5) return `${Math.floor(diff / 6e4)} 分钟前`;
  if (diff < 864e5) return `${Math.floor(diff / 36e5)} 小时前`;
  return `${Math.floor(diff / 864e5)} 天前`;
}
function clock(ts) {
  try {
    return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "--:--";
  }
}
function shortUA(ua) {
  if (!ua) return "未知设备";
  const device = /iPhone/i.test(ua) ? "iPhone" : /iPad/i.test(ua) ? "iPad" : /Android/i.test(ua) ? "Android" : /Windows/i.test(ua) ? "Windows" : /Macintosh|Mac OS X/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "未知设备";
  const browser = /Edg\//i.test(ua) ? "Edge" : /Chrome\//i.test(ua) && !/Chromium/i.test(ua) ? "Chrome" : /Firefox\//i.test(ua) ? "Firefox" : /Safari\//i.test(ua) ? "Safari" : "";
  return browser ? `${device} · ${browser}` : device;
}
function groupCode(code) {
  if (!code) return "";
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("浏览器拒绝了复制");
}
function RemoteLinkIcon({ size = 16 } = {}) {
  return h(
    "svg",
    { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
    h("rect", {
      x: 1.2,
      y: 2.4,
      width: 10.4,
      height: 7.4,
      rx: 1.4,
      stroke: "currentColor",
      strokeWidth: 1.25
    }),
    h("path", { d: "M4.4 12.2h4.2", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" }),
    h("rect", {
      x: 10.4,
      y: 7.6,
      width: 4.4,
      height: 6.6,
      rx: 1.2,
      fill: "var(--dsw-alias-bg-layer-1, #17171a)",
      stroke: "currentColor",
      strokeWidth: 1.25
    }),
    h("path", { d: "M11.9 12.6h1.4", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round" })
  );
}
function Card({ title, hint, children }) {
  return div(
    "dshrl-card",
    div("dshrl-card-head", span("dshrl-card-title", title), hint ? span("dshrl-card-hint", hint) : null),
    children
  );
}
function Row({ label, children, valueClass }) {
  return div(
    "dshrl-row",
    span("dshrl-row-label", label),
    h("span", { className: `dshrl-row-value ${valueClass || ""}` }, children)
  );
}
function Toggle({ on, onChange, disabled }) {
  return h("button", {
    type: "button",
    className: `dshrl-toggle ${on ? "is-on" : ""}`,
    role: "switch",
    "aria-checked": on ? "true" : "false",
    disabled,
    onClick: () => onChange(!on)
  });
}
function RemoteLinkPanel({ rpcCall }) {
  const rpcRef = React.useRef(rpcCall);
  rpcRef.current = rpcCall;
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [portDraft, setPortDraft] = React.useState("");
  const [advanced, setAdvanced] = React.useState(false);
  const [tokenDraft, setTokenDraft] = React.useState("");
  const showToast = React.useCallback((text) => {
    setToast(text);
  }, []);
  React.useEffect(() => {
    if (!toast) return void 0;
    const timer = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(timer);
  }, [toast]);
  React.useEffect(() => {
    let alive = true;
    let timer = 0;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const next = await rpcRef.current("status");
          if (alive) {
            setData(next);
            setError(null);
          }
        } catch (e) {
          if (alive) setError(String(e?.message ?? e));
        }
      }
      if (alive) timer = setTimeout(tick, 3e3);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  const run = React.useCallback(
    async (action, payload, successText) => {
      setBusy(action);
      try {
        const next = await rpcRef.current(action, payload);
        if (next) setData(next);
        setError(null);
        if (successText) showToast(successText);
      } catch (e) {
        setError(String(e?.message ?? e));
      } finally {
        setBusy(null);
      }
    },
    [showToast]
  );
  const onCopy = async (text) => {
    try {
      await copyText(text);
      showToast("连接串已复制");
    } catch (e) {
      showToast(`复制失败：${String(e?.message ?? e)}`);
    }
  };
  const running = Boolean(data?.running);
  const upstreamOk = data?.upstream?.ok;
  const devices = data?.devices ?? [];
  const liveCount = devices.filter((d) => d.live > 0).length;
  const link = data?.link || "";
  const tunnels = data?.tunnels ?? [];
  const qr = React.useMemo(() => link ? qrPath(link) : "", [link]);
  const qrCount = React.useMemo(() => link ? qrSize(link) : 25, [link]);
  const statusText = running ? upstreamOk === false ? "上游未就绪" : "运行中" : "已停止";
  const statusClass = running ? upstreamOk === false ? "is-err" : "is-on" : "is-off";
  return div(
    "dshrl-root",
    // ── 页头 ──
    div(
      "dshrl-head",
      div(
        "dshrl-head-main",
        h("h1", { className: "dshrl-title" }, "远程接入"),
        h(
          "p",
          { className: "dshrl-sub" },
          "手机连上这台电脑，用 DSH 的全部能力。服务只在这台机器上开一个带配对门的口子，DSH 本体仍然只听回环。"
        )
      ),
      div("dshrl-pill", span(`dshrl-dot ${statusClass}`), statusText)
    ),
    // ── 错误横幅 ──
    error ? div(
      "dshrl-banner",
      h("span", null, "⚠"),
      div(null, span(null, error)),
      btn("dshrl-btn dshrl-btn-sm dshrl-btn-ghost", { onClick: () => setError(null) }, "知道了")
    ) : null,
    // ── 上游没起来时的提示 ──
    data && !upstreamOk && running ? div("dshrl-banner dshrl-banner-warn", h("span", null, "!"), div(null, "上游 DSH webServer 探测不到，手机打开会报 502。请确认 DSH 仍在运行。")) : null,
    // ── 主体 ──
    div(
      "dshrl-grid",
      // ═══ 左列 ═══
      div(
        "dshrl-col",
        // 接入服务
        h(
          Card,
          { title: "接入服务" },
          div(
            "dshrl-power",
            div(
              "dshrl-power-text",
              div("dshrl-power-title", running ? "手机可以连进来了" : "接入服务未启动"),
              div(
                "dshrl-power-desc",
                running ? `对外 0.0.0.0:${data.port} → 本机 ${data.upstream?.authority || ""}` : "启动后手机才能连；带配对码校验，局域网里其他人打不开会话。"
              )
            ),
            running ? btn("dshrl-btn dshrl-btn-danger", { disabled: busy === "stop", onClick: () => run("stop", {}, "已停止") }, busy === "stop" ? "停止中…" : "停止接入") : btn(
              "dshrl-btn dshrl-btn-primary",
              { disabled: busy === "start", onClick: () => run("start", {}, "已启动") },
              busy === "start" ? "启动中…" : "启动接入"
            )
          ),
          h(
            "div",
            { className: "dshrl-rows", style: { marginTop: "12px" } },
            // 端口
            div(
              "dshrl-row",
              span("dshrl-row-label", "端口"),
              h(
                "div",
                { className: "dshrl-field", style: { marginLeft: "auto", maxWidth: "190px" } },
                h("input", {
                  className: "dshrl-input",
                  value: portDraft || String(data?.port ?? ""),
                  inputMode: "numeric",
                  onChange: (e) => setPortDraft(e.target.value.replace(/[^\d]/g, "")),
                  placeholder: String(data?.port ?? ""),
                  "aria-label": "接入服务端口"
                }),
                btn(
                  "dshrl-btn dshrl-btn-sm",
                  {
                    disabled: busy === "setPort" || !portDraft || portDraft === String(data?.port ?? ""),
                    onClick: () => {
                      run("setPort", { port: Number(portDraft) }, "端口已更新");
                      setPortDraft("");
                    }
                  },
                  "保存"
                )
              )
            ),
            // 上游
            h(
              Row,
              { label: "上游", valueClass: upstreamOk ? "dshrl-ok" : "dshrl-bad" },
              `${data?.upstream?.authority || "—"} ${upstreamOk ? "· 可达" : "· 不可达"}`
            ),
            // 在线
            h(Row, { label: "在线设备" }, `${liveCount} 台活跃 / ${devices.length} 台记录`)
          ),
          // 自动启动
          div(
            "dshrl-switch",
            div(
              "dshrl-switch-text",
              div(null, "DSH 启动时自动开启"),
              div("dshrl-switch-desc", "关掉后每次开机都要回来点一次「启动接入」")
            ),
            h(Toggle, {
              on: Boolean(data?.autoStart),
              disabled: busy === "setAutoStart",
              onChange: (next) => run("setAutoStart", { enabled: next })
            })
          )
        ),
        // 配对码
        h(
          Card,
          { title: "配对码", hint: running ? "手机凭它换到访问凭证" : "启动后生成" },
          div(
            "dshrl-code",
            span(`dshrl-code-big ${running ? "" : "is-muted"}`, running ? groupCode(data?.code) : "尚未启动"),
            running ? btn(
              "dshrl-btn dshrl-btn-sm dshrl-btn-danger",
              {
                disabled: busy === "regenerate",
                onClick: () => {
                  if (!window.confirm("换一个配对码？已经连上的手机会全部断开，需要重新粘贴新连接串。")) return;
                  run("regenerate", {}, "配对码已更换");
                }
              },
              "换一个"
            ) : null
          ),
          running ? div(
            "dshrl-link",
            span("dshrl-link-text", null, link),
            btn("dshrl-btn dshrl-btn-sm", { onClick: () => onCopy(link) }, "复制")
          ) : null,
          running ? h(
            "p",
            { className: "dshrl-sub", style: { marginTop: "10px" } },
            "换码等于吊销所有已配对设备 —— 配对凭证是整站一个，不能只踢一台。"
          ) : null
        ),
        // 已连接设备
        h(
          Card,
          { title: "已连接设备", hint: devices.length ? `${devices.length} 台` : "" },
          devices.length === 0 ? div("dshrl-empty", running ? "还没有设备接入。手机上打开连接串就会出现在这里。" : "启动接入服务后再看。") : div(
            null,
            ...devices.map(
              (d) => h(
                "div",
                { className: "dshrl-device", key: d.key },
                div(
                  "dshrl-device-main",
                  div("dshrl-device-ip", null, d.ip),
                  div("dshrl-device-meta", null, `${shortUA(d.ua)} · 请求 ${d.requests} · 最后活跃 ${ago(d.lastSeen)}`)
                ),
                d.live > 0 ? span("dshrl-badge is-live", `${d.live} 条连接`) : span("dshrl-badge", "空闲"),
                btn(
                  "dshrl-btn dshrl-btn-sm",
                  {
                    title: "只断开当前连接；浏览器通常会在几秒内自动重连",
                    disabled: busy === "kick",
                    onClick: () => run("kick", { key: d.key }, "已断开该设备的连接")
                  },
                  "断开"
                )
              )
            )
          )
        )
      ),
      // ═══ 右列 ═══
      div(
        "dshrl-col",
        // 扫码
        h(
          Card,
          { title: "扫码连接", hint: "手机相机直接扫" },
          link && qr ? div(
            null,
            div(
              "dshrl-qr",
              h(
                "svg",
                { viewBox: `0 0 ${qrCount} ${qrCount}`, shapeRendering: "crispEdges", role: "img", "aria-label": "配对二维码" },
                h("rect", { width: qrCount, height: qrCount, fill: "#fff" }),
                h("path", { d: qr, fill: "#000" })
              )
            ),
            h(
              "div",
              { className: "dshrl-sub", style: { textAlign: "center" } },
              "扫码后浏览器会自己带上配对码，一次成功。"
            )
          ) : div("dshrl-qr-empty", "启动接入服务后，这里显示二维码")
        ),
        // 手机怎么连
        h(
          Card,
          { title: "手机怎么连" },
          h(
            "ol",
            { className: "dshrl-steps" },
            h("li", null, "手机和电脑连同一个 WiFi（或都连同一台手机的 hotspot）。"),
            h("li", null, "启动上面的接入服务，拿到配对码和连接串。"),
            h(
              "li",
              null,
              "在 Kxxy 里：概览 → 远程控制 → 添加电脑 → 粘贴连接串。或者直接扫左边的二维码。"
            ),
            h("li", null, "连上后手机就落在 DSH 的界面上，对话、会话、文件都能用。")
          )
        ),
        // 外网接入
        h(
          Card,
          { title: "在外网也能连", hint: tunnels.some((t) => t.ready) ? "有可用通道" : "" },
          h(
            "div",
            { className: "dshrl-sub", style: { marginBottom: "4px" } },
            "手机不在同一个 WiFi 时，需要一条能穿出去的路。这里探测的是电脑上已经装好的工具 —— 插件只读地址，不代管进程：隧道什么时候开、什么时候关，仍然归那个工具自己，不会出现「面板关了隧道还在跑」。"
          ),
          tunnels.length ? div("dshrl-tuns", ...tunnels.map((t) => tunnelRow(t, onCopy))) : div("dshrl-empty", "暂时没有探测到可用的外网通道。"),
          h(
            "div",
            { style: { marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" } },
            btn(
              "dshrl-btn dshrl-btn-sm",
              { disabled: busy === "refreshTunnel", onClick: () => run("refreshTunnel") },
              "重新检测"
            ),
            ...tunnels.filter((t) => !t.ready && t.installUrl).map(
              (t) => h(
                "a",
                {
                  key: `get-${t.kind}`,
                  className: "dshrl-btn dshrl-btn-sm dshrl-btn-ghost",
                  href: t.installUrl,
                  target: "_blank",
                  rel: "noopener",
                  style: { textDecoration: "none" }
                },
                `${t.installed ? "去登录" : "下载"} ${t.label}`
              )
            )
          )
        ),
        // 事件日志
        h(
          Card,
          { title: "接入日志", hint: data?.events?.length ? `${data.events.length} 条` : "" },
          data?.events?.length ? div(
            "dshrl-events",
            ...data.events.map(
              (ev, i) => h(
                "div",
                { className: "dshrl-event", key: `${ev.at}-${i}` },
                span("dshrl-event-time", clock(ev.at)),
                span(
                  `dshrl-event-text ${ev.level === "error" ? "dshrl-bad" : ev.level === "warn" ? "dshrl-warn" : ""}`,
                  ev.text
                )
              )
            )
          ) : div("dshrl-empty", "还没有事件。"),
          data?.events?.length ? h(
            "div",
            { style: { marginTop: "10px" } },
            btn("dshrl-btn dshrl-btn-sm dshrl-btn-ghost", { disabled: busy === "clearEvents", onClick: () => run("clearEvents") }, "清空")
          ) : null
        ),
        // 高级
        h(
          Card,
          { title: "高级" },
          advanced ? div(
            null,
            h(
              "div",
              { className: "dshrl-sub", style: { marginBottom: "8px" } },
              "鉴权是自动的：插件向 DSH 取本进程的 launch token，连接器用它向本机换一个会话 cookie，手机侧全程看不到 token。只有自动取不到（例如 DSH 大版本改了方法）时才需要手工填一个。留空表示用自动取到的。"
            ),
            div(
              "dshrl-field",
              h("input", {
                className: "dshrl-input",
                value: tokenDraft,
                placeholder: data?.tokenSource === "manual" ? "已手工指定（留空表示改回自动）" : "自动获取中，通常不需要填",
                onChange: (e) => setTokenDraft(e.target.value)
              }),
              btn(
                "dshrl-btn dshrl-btn-sm",
                {
                  disabled: busy === "setToken",
                  onClick: () => {
                    run("setToken", { token: tokenDraft }, tokenDraft ? "token 已保存" : "token 已清除");
                    setTokenDraft("");
                  }
                },
                "保存"
              )
            ),
            h(
              "div",
              { className: "dshrl-rows", style: { marginTop: "10px" } },
              h(
                Row,
                { label: "鉴权方式" },
                data?.tokenSource === "launch" ? "本机 launch token（自动）" : data?.tokenSource === "manual" ? "手工填写" : "未取到 —— 手机会看到 401"
              ),
              h(
                Row,
                { label: "上游会话" },
                data?.hasSession ? "已建立" : data?.hasToken ? "首次访问时自动换取" : "不可用"
              ),
              h(Row, { label: "插件版本" }, data?.version || "—"),
              h(Row, { label: "运行环境" }, data?.node || "—")
            )
          ) : btn("dshrl-btn dshrl-btn-sm", { onClick: () => setAdvanced(true) }, "展开")
        )
      )
    ),
    // ── toast ──
    toast ? div("dshrl-toast", toast) : null
  );
}
var name = "dsh-remote-link-client";
var inject = ["slots", "connection"];
function apply(ctx) {
  ctx.effect(() => installStyles(), "dsh-remote-link: 注入样式");
  const rpcCall = async (method, payload, signal) => {
    const raw = await ctx.connection.rpc.call("/api", "remote-link", { method, payload }, signal);
    if (raw?.ok === true) return raw.value;
    if (raw?.ok === false) {
      const err = new Error(raw.error?.message || "远程接入请求失败");
      err.code = raw.error?.code;
      throw err;
    }
    return raw;
  };
  ctx.slots.inject(
    "main",
    () => ctx.slots.register(
      {
        name: "main",
        key: PANEL_ID,
        inject: () => ({ rpcCall })
      },
      RemoteLinkPanel
    )
  );
  ctx.slots.inject(
    "sidebar.panellist",
    () => ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: SIDEBAR_ORDER,
        label: () => "远程接入"
      },
      RemoteLinkIcon
    )
  );
}

    return module.exports;
  }
});
