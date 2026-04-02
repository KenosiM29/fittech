// apps/api/src/routes/gyms.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/mock-db";
import { bookSlot } from "../services/booking.service";

interface GymParams {
  id: string;
}

interface BookBody {
  userId: string;
  slotTime: string; // ISO date string
}

export async function gymRoutes(fastify: FastifyInstance) {
  // GET /gyms/:id/capacity
  fastify.get<{ Params: GymParams }>(
    "/gyms/:id/capacity",
    async (request: FastifyRequest<{ Params: GymParams }>, reply: FastifyReply) => {
      const gym = db.getGym(request.params.id);
      if (!gym) return reply.status(404).send({ error: "Gym not found" });

      const percentFull = Math.round((gym.currentCount / gym.capacity) * 100);

      return {
        gymId: gym.id,
        name: gym.name,
        capacity: gym.capacity,
        currentCount: gym.currentCount,
        percentFull,
      };
    }
  );

  // POST /gyms/:id/book
  fastify.post<{ Params: GymParams; Body: BookBody }>(
    "/gyms/:id/book",
    async (request: FastifyRequest<{ Params: GymParams; Body: BookBody }>, reply: FastifyReply) => {
      const { userId, slotTime } = request.body;
      if (!userId || !slotTime) {
        return reply.status(400).send({ error: "userId and slotTime are required" });
      }

      const result = await bookSlot(request.params.id, userId, slotTime);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          GYM_NOT_FOUND: 404,
          SLOT_FULL: 409,
          ALREADY_BOOKED: 409,
          LOCK_CONTENTION: 503,
        };
        return reply
          .status(statusMap[result.reason] ?? 500)
          .send({ error: result.reason });
      }

      return reply.status(201).send({ bookingId: result.bookingId });
    }
  );
}