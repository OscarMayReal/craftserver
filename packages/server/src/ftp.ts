import ftpsrv from 'ftp-srv';

const port = Number(process.env.FTP_PORT ?? 21);

const ftpServer = new ftpsrv({
  url: `ftp://0.0.0.0:${port}`,
  anonymous: true,
});

let startPromise: Promise<void> | null = null;

export function startFtpServer(): Promise<void> {
  if (!startPromise) {
    const listening = ftpServer.listen().then(() => {
      console.log(`FTP server listening on port ${port}`);
    }).catch((error: unknown) => {
      startPromise = null;
      throw error;
    });
    startPromise = listening;
  }
  return startPromise!;
}
