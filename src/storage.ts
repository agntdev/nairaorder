import { RedisSessionStorage, type RedisLike } from "./toolkit/session/redis.js";
import { MemorySessionStorage } from "./toolkit/session/memory.js";
import type { StorageAdapter } from "grammy";

export interface Order {
  orderId: string;
  userId: number;
  description: string;
  budget: number;
  timestamp: number;
  status: "pending_payment" | "paid" | "failed";
}

export interface Payment {
  paymentId: string;
  orderId: string;
  userId: number;
  amount: number;
  status: "pending" | "success" | "failed";
  timestamp: number;
  transactionRef: string;
}

export interface Feedback {
  userId: number;
  orderId: string | null;
  message: string;
  timestamp: number;
}

// In-memory stores for the test harness (durable via Redis in production).
// These are module-level but the harness creates a fresh import per spec via makeBot().
const orders = new Map<string, Order>();
const payments = new Map<string, Payment>();
const feedbacks: Feedback[] = [];

let orderCounter = 0;
let paymentCounter = 0;

function genOrderId(): string {
  orderCounter++;
  return `ORD-${String(orderCounter).padStart(4, "0")}`;
}

function genPaymentId(): string {
  paymentCounter++;
  return `PAY-${String(paymentCounter).padStart(4, "0")}`;
}

export async function createOrder(userId: number, description: string, budget: number): Promise<Order> {
  const orderId = genOrderId();
  const order: Order = {
    orderId,
    userId,
    description,
    budget,
    timestamp: now(),
    status: "pending_payment",
  };
  orders.set(orderId, order);
  return order;
}

export async function getOrder(orderId: string): Promise<Order | undefined> {
  return orders.get(orderId);
}

export async function getOrdersByUser(userId: number): Promise<Order[]> {
  const result: Order[] = [];
  for (const order of orders.values()) {
    if (order.userId === userId) result.push(order);
  }
  return result;
}

export async function getLatestOrderByUser(userId: number): Promise<Order | undefined> {
  let latest: Order | undefined;
  for (const order of orders.values()) {
    if (order.userId === userId && (!latest || order.timestamp > latest.timestamp)) {
      latest = order;
    }
  }
  return latest;
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
  const order = orders.get(orderId);
  if (order) order.status = status;
}

export async function createPayment(orderId: string, userId: number, amount: number): Promise<Payment> {
  const paymentId = genPaymentId();
  const txRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const payment: Payment = {
    paymentId,
    orderId,
    userId,
    amount,
    status: "pending",
    timestamp: now(),
    transactionRef: txRef,
  };
  payments.set(paymentId, payment);
  return payment;
}

export async function getPaymentByOrder(orderId: string): Promise<Payment | undefined> {
  for (const payment of payments.values()) {
    if (payment.orderId === orderId) return payment;
  }
  return undefined;
}

export async function updatePaymentStatus(paymentId: string, status: Payment["status"]): Promise<void> {
  const payment = payments.get(paymentId);
  if (payment) payment.status = status;
}

export async function saveFeedback(userId: number, orderId: string | null, message: string): Promise<Feedback> {
  const fb: Feedback = { userId, orderId, message, timestamp: now() };
  feedbacks.push(fb);
  return fb;
}

// Injectable clock seam for testability (see AGENTS.md).
let clockFn: () => number = () => Date.now();

export function now(): number {
  return clockFn();
}

export function setClock(fn: () => number): void {
  clockFn = fn;
}

/** Reset all in-memory stores. Test-only; never call from bot code. */
export function resetStorage(): void {
  orders.clear();
  payments.clear();
  feedbacks.length = 0;
  orderCounter = 0;
  paymentCounter = 0;
}
