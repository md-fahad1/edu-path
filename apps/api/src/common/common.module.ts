import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
/** Admin edit korle Next.js ISR page on-demand refresh (optional) */
@Injectable()
export class RevalidateService {
  private log = new Logger('Revalidate');
  paths(paths: string[]) {
    const url = process.env.REVALIDATE_URL;
    if (!url || !paths.length) return;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET, paths }),
    }).catch((e) => this.log.warn(`revalidate failed: ${e.message}`));
  }
}

@Global()
@Module({ providers: [PrismaService, RevalidateService, MailService], exports: [PrismaService, RevalidateService, MailService] })
export class CommonModule {}