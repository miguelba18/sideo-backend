import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { PlanEnum } from '../../../common/enums';

export class UpgradeSubscriptionDto {
  @IsEnum(PlanEnum)
  newPlan: PlanEnum;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}