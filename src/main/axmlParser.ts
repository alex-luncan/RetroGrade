/**
 * Android Binary XML (AXML) Parser
 * Converts binary XML files from Android APKs to readable text XML
 */

// Chunk types
const CHUNK_AXML_FILE = 0x00080003;
const CHUNK_RESOURCEIDS = 0x00080180;
const CHUNK_STRINGS = 0x001C0001;
const CHUNK_XML_START_NAMESPACE = 0x00100100;
const CHUNK_XML_END_NAMESPACE = 0x00100101;
const CHUNK_XML_START_TAG = 0x00100102;
const CHUNK_XML_END_TAG = 0x00100103;
const CHUNK_XML_TEXT = 0x00100104;

// Attribute types
const TYPE_NULL = 0;
const TYPE_REFERENCE = 1;
const TYPE_ATTRIBUTE = 2;
const TYPE_STRING = 3;
const TYPE_FLOAT = 4;
const TYPE_DIMENSION = 5;
const TYPE_FRACTION = 6;
const TYPE_INT_DEC = 16;
const TYPE_INT_HEX = 17;
const TYPE_INT_BOOLEAN = 18;

export function parseAXML(buffer: Buffer): string | null {
  try {
    const parser = new AXMLParser(buffer);
    return parser.parse();
  } catch (error) {
    console.error('AXML parse error:', error);
    return null;
  }
}

class AXMLParser {
  private buffer: Buffer;
  private pos: number = 0;
  private strings: string[] = [];
  private namespaces: Map<string, string> = new Map();
  private xml: string = '';
  private indent: number = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  parse(): string {
    // Check magic number
    const magic = this.readInt32();
    if (magic !== CHUNK_AXML_FILE) {
      throw new Error('Not a valid AXML file');
    }

    const fileSize = this.readInt32();

    while (this.pos < this.buffer.length) {
      const chunkType = this.readInt32();
      const chunkSize = this.readInt32();
      const chunkEnd = this.pos - 8 + chunkSize;

      switch (chunkType) {
        case CHUNK_STRINGS:
          this.parseStringPool(chunkSize);
          break;
        case CHUNK_RESOURCEIDS:
          // Skip resource IDs for now
          this.pos = chunkEnd;
          break;
        case CHUNK_XML_START_NAMESPACE:
          this.parseStartNamespace();
          break;
        case CHUNK_XML_END_NAMESPACE:
          this.parseEndNamespace();
          break;
        case CHUNK_XML_START_TAG:
          this.parseStartTag();
          break;
        case CHUNK_XML_END_TAG:
          this.parseEndTag();
          break;
        case CHUNK_XML_TEXT:
          this.parseText();
          break;
        default:
          // Unknown chunk, skip it
          this.pos = chunkEnd;
      }
    }

    return '<?xml version="1.0" encoding="utf-8"?>\n' + this.xml;
  }

  private parseStringPool(chunkSize: number): void {
    const stringCount = this.readInt32();
    const styleCount = this.readInt32();
    const flags = this.readInt32();
    const stringsStart = this.readInt32();
    const stylesStart = this.readInt32();

    const isUtf8 = (flags & (1 << 8)) !== 0;

    // Read string offsets
    const stringOffsets: number[] = [];
    for (let i = 0; i < stringCount; i++) {
      stringOffsets.push(this.readInt32());
    }

    // Skip style offsets
    this.pos += styleCount * 4;

    // Read strings
    const stringsDataStart = this.pos;
    for (let i = 0; i < stringCount; i++) {
      const offset = stringOffsets[i];
      this.pos = stringsDataStart + offset;

      if (isUtf8) {
        this.strings.push(this.readUtf8String());
      } else {
        this.strings.push(this.readUtf16String());
      }
    }

    // Move to end of chunk
    this.pos = stringsDataStart - 28 + chunkSize;
  }

  private readUtf8String(): string {
    // Skip char length
    let len = this.buffer[this.pos++];
    if ((len & 0x80) !== 0) {
      len = ((len & 0x7F) << 8) | this.buffer[this.pos++];
    }

    // Read byte length
    let byteLen = this.buffer[this.pos++];
    if ((byteLen & 0x80) !== 0) {
      byteLen = ((byteLen & 0x7F) << 8) | this.buffer[this.pos++];
    }

    const str = this.buffer.toString('utf8', this.pos, this.pos + byteLen);
    this.pos += byteLen + 1; // +1 for null terminator
    return str;
  }

  private readUtf16String(): string {
    let len = this.readInt16();
    if ((len & 0x8000) !== 0) {
      len = ((len & 0x7FFF) << 16) | this.readInt16();
    }

    const str = this.buffer.toString('utf16le', this.pos, this.pos + len * 2);
    this.pos += len * 2 + 2; // +2 for null terminator
    return str;
  }

  private parseStartNamespace(): void {
    const lineNumber = this.readInt32();
    const comment = this.readInt32();
    const prefix = this.readInt32();
    const uri = this.readInt32();

    const prefixStr = this.getString(prefix);
    const uriStr = this.getString(uri);

    if (prefixStr && uriStr) {
      this.namespaces.set(uriStr, prefixStr);
    }
  }

  private parseEndNamespace(): void {
    const lineNumber = this.readInt32();
    const comment = this.readInt32();
    const prefix = this.readInt32();
    const uri = this.readInt32();
  }

  private parseStartTag(): void {
    const lineNumber = this.readInt32();
    const comment = this.readInt32();
    const namespaceUri = this.readInt32();
    const name = this.readInt32();
    const attrStart = this.readInt16();
    const attrSize = this.readInt16();
    const attrCount = this.readInt16();
    const idIndex = this.readInt16();
    const classIndex = this.readInt16();
    const styleIndex = this.readInt16();

    const tagName = this.getString(name);
    const indentStr = '  '.repeat(this.indent);

    let attrs = '';
    const nsDecls: string[] = [];

    // Add namespace declarations for root element
    if (this.indent === 0) {
      for (const [uri, prefix] of this.namespaces) {
        nsDecls.push(`xmlns:${prefix}="${uri}"`);
      }
    }

    // Parse attributes
    for (let i = 0; i < attrCount; i++) {
      const attrNsUri = this.readInt32();
      const attrName = this.readInt32();
      const attrValueStr = this.readInt32();
      const attrType = this.readInt16();
      this.readInt16(); // size
      const attrData = this.readInt32();

      let attrNameStr = this.getString(attrName);
      const nsUri = this.getString(attrNsUri);

      if (nsUri && this.namespaces.has(nsUri)) {
        attrNameStr = `${this.namespaces.get(nsUri)}:${attrNameStr}`;
      }

      const value = this.formatValue(attrType, attrData, attrValueStr);
      attrs += ` ${attrNameStr}="${this.escapeXml(value)}"`;
    }

    // Build tag
    const nsAttrs = nsDecls.length > 0 ? ' ' + nsDecls.join(' ') : '';
    this.xml += `${indentStr}<${tagName}${nsAttrs}${attrs}>\n`;
    this.indent++;
  }

  private parseEndTag(): void {
    const lineNumber = this.readInt32();
    const comment = this.readInt32();
    const namespaceUri = this.readInt32();
    const name = this.readInt32();

    this.indent--;
    const tagName = this.getString(name);
    const indentStr = '  '.repeat(this.indent);
    this.xml += `${indentStr}</${tagName}>\n`;
  }

  private parseText(): void {
    const lineNumber = this.readInt32();
    const comment = this.readInt32();
    const textIndex = this.readInt32();
    this.readInt32(); // unknown
    this.readInt32(); // unknown

    const text = this.getString(textIndex);
    if (text && text.trim()) {
      const indentStr = '  '.repeat(this.indent);
      this.xml += `${indentStr}${this.escapeXml(text)}\n`;
    }
  }

  private formatValue(type: number, data: number, stringIndex: number): string {
    switch (type >> 4) {
      case TYPE_NULL:
        return '';
      case TYPE_REFERENCE:
        return `@0x${data.toString(16).padStart(8, '0')}`;
      case TYPE_ATTRIBUTE:
        return `?0x${data.toString(16).padStart(8, '0')}`;
      case TYPE_STRING:
        return this.getString(stringIndex);
      case TYPE_FLOAT:
        const floatView = new DataView(new ArrayBuffer(4));
        floatView.setInt32(0, data, true);
        return floatView.getFloat32(0, true).toString();
      case TYPE_DIMENSION:
        return this.formatDimension(data);
      case TYPE_FRACTION:
        return this.formatFraction(data);
      case TYPE_INT_DEC:
        return data.toString();
      case TYPE_INT_HEX:
        return `0x${(data >>> 0).toString(16)}`;
      case TYPE_INT_BOOLEAN:
        return data !== 0 ? 'true' : 'false';
      default:
        return `0x${(data >>> 0).toString(16)}`;
    }
  }

  private formatDimension(data: number): string {
    const units = ['px', 'dip', 'sp', 'pt', 'in', 'mm'];
    const unit = units[data & 0xF] || 'px';
    const value = (data >> 8) / 256;
    return `${value}${unit}`;
  }

  private formatFraction(data: number): string {
    const types = ['%', '%p'];
    const type = types[data & 0xF] || '%';
    const value = (data >> 8) / 256 * 100;
    return `${value}${type}`;
  }

  private getString(index: number): string {
    if (index < 0 || index >= this.strings.length) {
      return '';
    }
    return this.strings[index] || '';
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private readInt32(): number {
    const value = this.buffer.readInt32LE(this.pos);
    this.pos += 4;
    return value;
  }

  private readInt16(): number {
    const value = this.buffer.readInt16LE(this.pos);
    this.pos += 2;
    return value;
  }
}

/**
 * Check if a buffer is binary XML
 */
export function isBinaryXml(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const magic = buffer.readInt32LE(0);
  return magic === CHUNK_AXML_FILE;
}
