import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(60) name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(/^01[3-9]\d{8}$/, { message: 'phone must be a valid BD number (01XXXXXXXXX)' }) phone?: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}

export class LoginDto {
  @IsString() @MinLength(3) identifier: string; // email ba phone
  @IsString() @MinLength(1) password: string;
}
export class ForgotPasswordDto {
  @IsEmail() email: string;
}

export class ResetPasswordDto {
  @IsString() @MinLength(20) @MaxLength(200) token: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}
