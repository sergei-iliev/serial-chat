
class WebSerial{
    constructor(){        
        this.serialPort = null;
        this.serialWriter = null;
        this.writableStreamClosed=null;

        this.serialReader = null;       
        this.readableStreamClosed=null 

        this.keepReading=false 
    }
 /**
   * Attempts to connect to the existing port (if provided). Otherwise prompts the user
   * to connect to a new serial device (with the portFilters, if provided)
   * 
   * @param {port} existingPort 
   * @param {dictionary} portFilters https://reillyeon.github.io/serial/#serialportfilter-dictionary
   */
  async connect(baudRate) {    
        // if the user does not pass in an existing port 
      this.serialPort = await navigator.serial.requestPort({});            
      var speed = parseInt(baudRate);      
      await this.serialPort.open({ baudRate: speed});               
  }
  async readLoop(){
      // Setup serial output stream as text

      const textEncoder = new TextEncoderStream();
      this.writableStreamClosed = textEncoder.readable.pipeTo(this.serialPort.writable);
      this.serialWriter = textEncoder.writable.getWriter();
      console.log("Serial writer set up as:", this.serialWriter);

      
      const textDecoder = new TextDecoderStream();
      this.keepReading = true;
      this.readableStreamClosed = this.serialPort.readable.pipeTo(textDecoder.writable);
      this.serialReader = textDecoder.readable
        .pipeThrough(new TransformStream(new LineBreakTransformer()))
        .getReader();

        while (this.serialPort.readable && this.keepReading) {
          try {
            while (true) {
              const { value, done } = await this.serialReader.read();
  
              if (done) {
                // Allow the serial port to be closed later.
                this.serialReader.releaseLock();
                break;
              }
  
              if (value) {
                console.log("Serial received:", value);                
              }
            }
  
          } catch (error) {
            // handle non-fatal error
            //this.fireNewErrorEvent(error);
            //this.fireEvent(SerialEvents.ERROR_OCCURRED, error);
          }
          finally {
            // see https://reillyeon.github.io/serial/#close-method
            this.serialReader.releaseLock();
          }
        }  

  }
  async close(){    
    await this.serialPort.close();
    this.serialPort = null;
  }
    
}

class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.chunks = "";
  }

  transform(chunk, controller) {
    // Append new chunks to existing chunks.
    this.chunks += chunk;
    // For each line breaks in chunks, send the parsed lines out.
    const lines = this.chunks.split("\r\n");
    this.chunks = lines.pop();
    lines.forEach((line) => controller.enqueue(line));
  }

  flush(controller) {
    // When the stream is closed, flush any remaining chunks out.
    controller.enqueue(this.chunks);
  }
}