export enum PlanEnum {
  PLUS = 'plus',
  PRO = 'pro',
  MAX = 'max',
}

export const PLAN_LIMITS: Record<PlanEnum, number> = {
  [PlanEnum.PLUS]: 10,
  [PlanEnum.PRO]: 20,
  [PlanEnum.MAX]: 50,
};