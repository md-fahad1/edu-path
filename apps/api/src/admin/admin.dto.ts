import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class OptionInput {
  @IsString() @MinLength(1) @MaxLength(500) text: string;
  @IsBoolean() isCorrect: boolean;
}

export class QuestionInput {
  @IsString() @MinLength(3) @MaxLength(2000) text: string;
  @IsOptional() @IsString() @MaxLength(4000) explanation?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  @IsString() chapterId: string;
  @IsOptional() @IsString() topicId?: string | null;
  @IsOptional() @IsString() examId?: string | null;
  @IsOptional() @IsInt() @Min(1900) @Max(2100) year?: number | null;
  @IsOptional() @IsString() @MaxLength(120) source?: string | null;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(4) @ValidateNested({ each: true }) @Type(() => OptionInput) options: OptionInput[];
}

export class UpdateQuestionInput {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(2000) text?: string;
  @IsOptional() @IsString() @MaxLength(4000) explanation?: string | null;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  @IsOptional() @IsString() chapterId?: string;
  @IsOptional() @IsString() topicId?: string | null;
  @IsOptional() @IsString() examId?: string | null;
  @IsOptional() @IsInt() @Min(1900) @Max(2100) year?: number | null;
  @IsOptional() @IsString() @MaxLength(120) source?: string | null;
  @IsOptional() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(4) @ValidateNested({ each: true }) @Type(() => OptionInput) options?: OptionInput[];
}

export class StatusInput {
  @IsIn(['DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED']) status: 'DRAFT' | 'REVIEWED' | 'PUBLISHED' | 'ARCHIVED';
}

export class BulkStatusInput extends StatusInput {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) ids: string[];
}

export class CsvInput {
  @IsString() @MaxLength(2_000_000) csv: string;
  @IsOptional() @IsString() defaultChapterId?: string;
}

export class TestInput {
  @IsString() @MinLength(3) title: string;
  @IsOptional() @IsString() chapterId?: string;
  @IsOptional() @IsString() examId?: string;
  @IsOptional() @IsIn(['CHAPTER', 'EXAM_PAPER', 'MOCK', 'CUSTOM']) type?: 'CHAPTER' | 'EXAM_PAPER' | 'MOCK' | 'CUSTOM';
  @IsInt() @Min(1) @Max(300) durationMin: number;
  @IsNumber() @Min(0) @Max(5) negativeMark: number;
  @IsOptional() @IsNumber() @Min(0.25) markPerQ?: number;
  @IsOptional() @IsBoolean() isPremium?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(200) count?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) questionIds?: string[];
}

export class UpdateTestInput {
  @IsOptional() @IsString() @MinLength(3) title?: string;
  @IsOptional() @IsInt() @Min(1) @Max(300) durationMin?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(5) negativeMark?: number;
  @IsOptional() @IsBoolean() isPremium?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UserUpdateInput {
  @IsOptional() @IsIn(['STUDENT', 'TEACHER', 'ADMIN']) role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class PlanInput {
  @IsString() @MinLength(2) name: string;
  @IsInt() @Min(0) priceBdt: number;
  @IsInt() @Min(1) durationDays: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReportUpdateInput {
  @IsIn(['RESOLVED', 'REJECTED', 'OPEN']) status: 'RESOLVED' | 'REJECTED' | 'OPEN';
}
