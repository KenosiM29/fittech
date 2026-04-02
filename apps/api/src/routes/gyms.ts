// apps/api/src/routes/gyms.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/mock-db";
import { bookSlot } from "../services/booking.service";

interface GymParams { id: string; }
interface BookBody  { userId: string; slotTime: string; }

function buildGymResponse(gym: ReturnType<typeof db.getGym>) {
  if (!gym) return null;
  const percentFull = Math.round((gym.currentCount / gym.capacity) * 100);
  return {
    gymId:        gym.id,
    name:         gym.name,
    location:     gym.location,
    address:      gym.address,
    capacity:     gym.capacity,
    currentCount: gym.currentCount,
    percentFull,
    isFull:       gym.currentCount >= gym.capacity,
  };
}

// Generate time slots for today and tomorrow
function generateSlots(gymId: string): { slotTime: string; label: string; available: boolean }[] {
  const slots = [];
  const now = new Date();
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  for (const hour of hours) {
    const slot = new Date();
    slot.setHours(hour, 0, 0, 0);
    if (slot <= now) continue; // skip past slots

    const bookingsForSlot = db.getBookingsForSlot(gymId, slot.toISOString());
    const gym = db.getGym(gymId);
    const slotCapacity = gym ? Math.floor(gym.capacity / 4) : 10;

    slots.push({
      slotTime:  slot.toISOString(),
      label:     slot.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }),
      available: bookingsForSlot.length < slotCapacity,
    });
  }
  return slots;
}

export async function gymRoutes(fastify: FastifyInstance) {

  // GET /gyms — list all gyms
  fastify.get("/gyms", async (_request, reply) => {
    const gyms = db.getAllGyms().map(buildGymResponse);
    return reply.send(gyms);
  });

  // GET /gyms/:id/capacity
  fastify.get<{ Params: GymParams }>(
    "/gyms/:id/capacity",
    async (request, reply) => {
      const gym = db.getGym(request.params.id);
      if (!gym) return reply.status(404).send({ error: "Gym not found" });
      return reply.send(buildGymResponse(gym));
    }
  );

  // GET /gyms/:id/slots — available time slots
  fastify.get<{ Params: GymParams }>(
    "/gyms/:id/slots",
    async (request, reply) => {
      const gym = db.getGym(request.params.id);
      if (!gym) return reply.status(404).send({ error: "Gym not found" });
      const slots = generateSlots(request.params.id);
      return reply.send({ gymId: request.params.id, slots });
    }
  );

  // POST /gyms/:id/book
  fastify.post<{ Params: GymParams; Body: BookBody }>(
    "/gyms/:id/book",
    async (request, reply) => {
      const { userId, slotTime } = request.body ?? {};
      if (!userId || !slotTime) {
        return reply.status(400).send({ error: "userId and slotTime are required" });
      }
      const result = await bookSlot(request.params.id, userId, slotTime);
      if (!result.success) {
        const statusMap: Record<string, number> = {
          GYM_NOT_FOUND:   404,
          SLOT_FULL:       409,
          ALREADY_BOOKED:  409,
          LOCK_CONTENTION: 503,
        };
        return reply.status(statusMap[result.reason] ?? 500).send({ error: result.reason });
      }
      return reply.status(201).send({ bookingId: result.bookingId });
    }
  );
}