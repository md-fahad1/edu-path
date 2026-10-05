import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminService } from './admin.service';
import { BulkStatusInput, CsvInput, PlanInput, QuestionInput, ReportUpdateInput, StatusInput, TestInput, UpdateQuestionInput, UpdateTestInput, UserUpdateInput } from './admin.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@Controller('admin')
class AdminController {
  constructor(private s: AdminService) {}

  @Get('stats') stats() { return this.s.stats(); }

  // questions
  @Get('questions') questions(@Query() q: any) { return this.s.listQuestions(q); }
  @Get('questions/:id') question(@Param('id') id: string) { return this.s.getQuestion(id); }
  @Post('questions') create(@Body() dto: QuestionInput, @CurrentUser() u: AuthUser) { return this.s.createQuestion(dto, u); }
  @Patch('questions/bulk-status') bulk(@Body() dto: BulkStatusInput, @CurrentUser() u: AuthUser) { return this.s.bulkStatus(dto.ids, dto.status, u); }
  @Patch('questions/:id') update(@Param('id') id: string, @Body() dto: UpdateQuestionInput, @CurrentUser() u: AuthUser) { return this.s.updateQuestion(id, dto, u); }
  @Patch('questions/:id/status') status(@Param('id') id: string, @Body() dto: StatusInput, @CurrentUser() u: AuthUser) { return this.s.setStatus(id, dto.status, u); }
  @Get('review-queue') review(@Query('lowConfidence') low?: string, @Query('subjectId') subjectId?: string, @Query('page') page?: string) {
    return this.s.reviewQueue({ lowConfidence: low === 'true', subjectId, page: Number(page) || 1 });
  }

  // imports
  @Post('imports/preview') preview(@Body() dto: CsvInput) { return this.s.importPreview(dto.csv, dto.defaultChapterId); }
  @Post('imports/commit') commit(@Body() dto: CsvInput, @CurrentUser() u: AuthUser) { return this.s.importCommit(dto.csv, dto.defaultChapterId, u); }
  @Get('imports') imports() { return this.s.importJobs(); }

  // reports
  @Roles('ADMIN') @Get('reports') reports(@Query('status') status?: string) { return this.s.reports(status); }
  @Roles('ADMIN') @Patch('reports/:id') report(@Param('id') id: string, @Body() dto: ReportUpdateInput) { return this.s.updateReport(id, dto.status); }

  // catalog (admin only)
  @Roles('ADMIN') @Get('catalog/:entity') list(@Param('entity') e: string, @Query('parentId') parentId?: string) { return this.s.catalogList(e, parentId); }
  @Roles('ADMIN') @Post('catalog/:entity') add(@Param('entity') e: string, @Body() body: Record<string, any>) { return this.s.catalogCreate(e, body); }
  @Roles('ADMIN') @Patch('catalog/:entity/:id') edit(@Param('entity') e: string, @Param('id') id: string, @Body() body: Record<string, any>) { return this.s.catalogUpdate(e, id, body); }
  @Roles('ADMIN') @Delete('catalog/:entity/:id') remove(@Param('entity') e: string, @Param('id') id: string) { return this.s.catalogDelete(e, id); }

  // tests
  @Get('tests') tests() { return this.s.tests(); }
  @Post('tests') createTest(@Body() dto: TestInput, @CurrentUser() u: AuthUser) { return this.s.createTest(dto, u); }
  @Patch('tests/:id') updateTest(@Param('id') id: string, @Body() dto: UpdateTestInput, @CurrentUser() u: AuthUser) { return this.s.updateTest(id, dto, u); }

  // users, plans, payments (admin only)
  @Roles('ADMIN') @Get('users') users(@Query('search') search?: string, @Query('page') page?: string) { return this.s.users(search, Number(page) || 1); }
  @Roles('ADMIN') @Patch('users/:id') user(@Param('id') id: string, @Body() dto: UserUpdateInput, @CurrentUser() u: AuthUser) { return this.s.updateUser(id, dto, u); }
  @Roles('ADMIN') @Get('plans') plans() { return this.s.plans(); }
  @Roles('ADMIN') @Post('plans') addPlan(@Body() dto: PlanInput) { return this.s.createPlan(dto); }
  @Roles('ADMIN') @Patch('plans/:id') editPlan(@Param('id') id: string, @Body() dto: PlanInput) { return this.s.updatePlan(id, dto); }
  @Roles('ADMIN') @Get('payments') payments(@Query('status') status?: string) { return this.s.payments(status); }
  @Roles('ADMIN') @Post('payments/:id/approve') approve(@Param('id') id: string) { return this.s.approvePayment(id); }
  @Roles('ADMIN') @Post('payments/:id/reject') reject(@Param('id') id: string) { return this.s.rejectPayment(id); }
}

@Module({ imports: [SubscriptionsModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
