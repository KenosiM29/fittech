// apps/api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { gymRoutes } from "./routes/gyms";

const server = Fastify({ logger: true });

server.register(cors, { origin: true });
server.register(gymRoutes);

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();