import { IsString, IsOptional } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  idToken: string;

  @IsString()
  @IsOptional()
  timezone?: string; // IANA timezone (예: 'Asia/Seoul', 'America/New_York')
}
