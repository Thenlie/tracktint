declare module 'fit-file-parser' {
  interface Options {
    force?: boolean;
    speedUnit?: 'km/h' | 'm/s' | 'mph';
    lengthUnit?: 'km' | 'm' | 'mi';
    temperatureUnit?: 'celsius' | 'kelvin' | 'fahrenheit';
    elapsedRecordField?: boolean;
    mode?: 'list' | 'cascade' | 'both';
  }

  interface RecordMessage {
    position_lat?: number;
    position_long?: number;
    timestamp?: Date;
    [key: string]: unknown;
  }

  interface FitData {
    records?: RecordMessage[];
    [key: string]: unknown;
  }

  type ParseCallback = (error: Error | null, data: FitData) => void;

  class FitParser {
    constructor(options?: Options);
    parse(content: Buffer | ArrayBuffer, callback: ParseCallback): void;
  }

  export default FitParser;
}
