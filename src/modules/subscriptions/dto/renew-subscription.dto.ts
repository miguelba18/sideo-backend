import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { PlanEnum } from '../../../common/enums';

export class RenewSubscriptionDto {
  @IsEnum(PlanEnum)
  plan: PlanEnum;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}