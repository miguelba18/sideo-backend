import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PlanEnum } from 'src/common/enums/plan.enum';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  nit: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  adminFirstName: string;

  @IsString()
  @IsNotEmpty()
  adminLastName: string;

  @IsEmail()
  adminEmail: string;

  @IsEnum(PlanEnum)
  plan: PlanEnum;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}