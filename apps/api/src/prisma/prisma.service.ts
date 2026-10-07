import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 10,                        // একসাথে কানেকশন সংখ্যা
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 15_000, // Neon জাগতে সময় নিলে অপেক্ষা (আগের transaction timeout এড়াতে)
        keepAlive: true,
      }),
    });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}