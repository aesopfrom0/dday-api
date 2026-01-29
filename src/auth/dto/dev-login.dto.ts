import { IsEmail, IsString, IsOptional } from 'class-validator';

export class DevLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  timezone?: string; // IANA timezone (예: 'Asia/Seoul', 'America/New_York')
}
