import { createServer } from "./server";
import { env } from "./env";
import { prisma } from "./prisma";

const { server } = createServer();

const port = env.port;

server.listen(port, () => {
  console.log(`[streamcircle] backend running on port ${port}`);
});

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

shutdownSignals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n[streamcircle] received ${signal}, closing gracefully...`);
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  });
});
