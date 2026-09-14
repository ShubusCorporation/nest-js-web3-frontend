import pino from 'pino';

export const logger = pino({
  level: import.meta.env.MODE === 'development' ? 'debug' : 'info',
  browser: {
    asObject: true,
    write: (o: unknown) => {
      console.log(o);
    }
  }
});
