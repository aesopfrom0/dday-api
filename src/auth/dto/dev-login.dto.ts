import { IsEmail, IsString, IsOptional } from 'class-validator';

export class DevLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;
}
