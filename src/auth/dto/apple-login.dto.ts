import { IsString, IsEmail, IsOptional } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identityToken: string;

  @IsString()
  @IsOptional()
  authorizationCode?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  timezone?: string; // IANA timezone (예: 'Asia/Seoul', 'America/New_York')
}
