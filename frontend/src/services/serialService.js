/**
 * Service to manage Web Serial API connection with Arduino UNO.
 */

class SerialService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readableStreamClosed = null;
    this.writableStreamClosed = null;
    this.isConnected = false;
    this.onDataCallback = null;
    this.onDisconnectCallback = null;
    this.onErrorCallback = null;
    this.buffer = '';
  }

  /**
   * Check if Web Serial API is supported in current browser environment.
   */
  isSupported() {
    return 'serial' in navigator;
  }

  /**
   * Connect to Arduino via Web Serial API.
   * @param {number} baudRate Baud rate, defaults to 9600
   */
  async connect(baudRate = 9600) {
    if (!this.isSupported()) {
      throw new Error('Web Serial API no es compatible con este navegador. Utiliza Google Chrome, MS Edge u Opera.');
    }

    try {
      // Request user to select port
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: parseInt(baudRate, 10) || 9600 });

      this.isConnected = true;

      // Listen for disconnect events at hardware level
      this.port.addEventListener('disconnect', () => {
        this.handleDisconnect('Puerto desconectado físicamente.');
      });

      // Start continuous background read loop
      this.startReading();
      return true;
    } catch (err) {
      this.isConnected = false;
      if (err.name === 'NotFoundError') {
        throw new Error('No se seleccionó ningún puerto serial.');
      }
      throw new Error(`Error al abrir puerto serial: ${err.message}`);
    }
  }

  /**
   * Continuous read loop for incoming serial line stream.
   */
  async startReading() {
    while (this.port && this.port.readable && this.isConnected) {
      try {
        const textDecoder = new TextDecoderStream();
        this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        this.reader = textDecoder.readable.getReader();

        while (true) {
          const { value, done } = await this.reader.read();
          if (done) {
            this.reader.releaseLock();
            break;
          }
          if (value) {
            this.processChunk(value);
          }
        }
      } catch (error) {
        if (this.isConnected) {
          if (this.onErrorCallback) {
            this.onErrorCallback(`Error de lectura serial: ${error.message}`);
          }
          this.handleDisconnect(`Error en el canal de lectura serial: ${error.message}`);
        }
        break;
      }
    }
  }

  /**
   * Process raw incoming string chunk into newline-delimited JSON messages.
   */
  processChunk(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    // Keep the incomplete last line in the buffer
    this.buffer = lines.pop();

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const parsed = JSON.parse(line);
          if (this.onDataCallback) {
            this.onDataCallback(parsed);
          }
        } catch (e) {
          // Ignore malformed JSON lines caused by serial noise
        }
      }
    }
  }

  /**
   * Send text command line to Arduino.
   * @param {string} command
   */
  async sendCommand(command) {
    if (!this.isConnected || !this.port || !this.port.writable) {
      throw new Error('No hay conexión serial activa con el Arduino.');
    }

    try {
      const textEncoder = new TextEncoderStream();
      this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      const writer = textEncoder.writable.getWriter();
      await writer.write(command.endsWith('\n') ? command : command + '\n');
      writer.releaseLock();
      return true;
    } catch (err) {
      if (this.onErrorCallback) {
        this.onErrorCallback(`Error al enviar comando '${command}': ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * Disconnect from serial port.
   */
  async disconnect() {
    this.isConnected = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
      }
    } catch (e) {
      // Stream cancellation error ignored
    }

    try {
      if (this.port) {
        await this.port.close();
      }
    } catch (e) {
      // Port close error ignored
    }

    this.port = null;
    this.reader = null;
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback('Conexión serial cerrada por el usuario.');
    }
  }

  /**
   * Internal disconnect handler.
   */
  handleDisconnect(reason) {
    this.isConnected = false;
    this.port = null;
    this.reader = null;
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback(reason);
    }
  }

  onData(cb) {
    this.onDataCallback = cb;
  }

  onDisconnect(cb) {
    this.onDisconnectCallback = cb;
  }

  onError(cb) {
    this.onErrorCallback = cb;
  }
}

export const serialService = new SerialService();
