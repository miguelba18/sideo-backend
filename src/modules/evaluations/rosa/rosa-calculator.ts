export interface RosaChairInput {
  seatHeight: number;
  seatHeightNoLegRoom: boolean;
  seatHeightNotAdjustable: boolean;

  seatDepth: number;
  seatDepthNotAdjustable: boolean;

  armrests: number;
  armrestsTooWide: boolean;
  armrestsSurfaceHard: boolean;
  armrestsNotAdjustable: boolean;

  backrest: number;
  backrestShouldersRaised: boolean;
  backrestNotAdjustable: boolean;

  chairUsageTime: number;
}

export interface RosaScreenInput {
  screen: number;
  screenTilted: boolean;
  screenDocumentsNoHolder: boolean;
  screenGlare: boolean;
  screenTooFar: boolean;

  screenUsageTime: number;
  phoneUsageTime: number;

  phone: number;
  phoneNeck: boolean;
  phoneNoHandsFree: boolean;
}

export interface RosaPeripheralsInput {
  mouse: number;
  mouseSmall: boolean;
  mouseDifferentHeight: boolean;
  mouseWristPressure: boolean;

  keyboard: number;
  keyboardWristDeviated: boolean;
  keyboardTooHigh: boolean;
  keyboardObjectsOverhead: boolean;
  keyboardNotAdjustable: boolean;

  mouseUsageTime: number;
  keyboardUsageTime: number;
}

export interface RosaInput {
  chair: RosaChairInput;
  screen: RosaScreenInput;
  peripherals: RosaPeripheralsInput;
}

export interface RosaScores {
  seatHeight: number;
  seatDepth: number;
  armrests: number;
  backrest: number;
  chairTableA: number;
  chairUsageTime: number;
  chairTotal: number;

  screenRaw: number;
  screenWithTime: number;
  phoneRaw: number;
  phoneWithTime: number;
  tableB: number;

  mouseRaw: number;
  mouseWithTime: number;
  keyboardRaw: number;
  keyboardWithTime: number;
  tableC: number;

  tableD: number;

  rosaFinal: number;
  riskLevel: string;
  actionLevel: number;
  actionRequired: string;
  recommendations: string[];
}

export class RosaCalculator {
  private readonly TABLE_A: number[][] = [
    [],
    [0, 0, 2, 2, 3, 4, 5, 6, 7, 8],
    [0, 0, 2, 2, 3, 4, 5, 6, 7, 8],
    [0, 0, 3, 3, 3, 4, 5, 6, 7, 8],
    [0, 0, 4, 4, 4, 4, 5, 6, 7, 8],
    [0, 0, 5, 5, 5, 5, 6, 7, 8, 9],
    [0, 0, 6, 6, 6, 7, 7, 8, 8, 9],
    [0, 0, 7, 7, 7, 8, 8, 9, 9, 9],
    [0, 0, 7, 7, 7, 8, 8, 9, 9, 9],
  ];

  private readonly TABLE_B: number[][] = [
    [0, 1, 1, 1, 2, 3, 4, 5, 6],
    [0, 1, 1, 2, 2, 3, 4, 5, 6],
    [0, 1, 2, 2, 3, 3, 4, 6, 7],
    [0, 2, 2, 3, 3, 4, 5, 6, 8],
    [0, 3, 3, 4, 4, 5, 6, 7, 8],
    [0, 4, 4, 5, 5, 6, 7, 8, 9],
    [0, 5, 5, 6, 7, 8, 8, 9, 9],
  ];

  private readonly TABLE_C: number[][] = [
    [0, 1, 1, 1, 2, 3, 4, 5, 6],
    [0, 1, 1, 2, 3, 4, 5, 6, 7],
    [0, 1, 2, 2, 3, 4, 5, 6, 7],
    [0, 2, 3, 3, 3, 5, 6, 7, 8],
    [0, 3, 4, 4, 5, 5, 6, 7, 8],
    [0, 4, 5, 5, 6, 6, 7, 8, 9],
    [0, 5, 6, 6, 7, 7, 8, 8, 9],
    [0, 6, 7, 7, 8, 8, 9, 9, 9],
  ];

  private readonly TABLE_D: number[][] = [
    [],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [0, 2, 2, 3, 4, 5, 6, 7, 8, 9],
    [0, 3, 3, 3, 4, 5, 6, 7, 8, 9],
    [0, 4, 4, 4, 4, 5, 6, 7, 8, 9],
    [0, 5, 5, 5, 5, 5, 6, 7, 8, 9],
    [0, 6, 6, 6, 6, 6, 6, 7, 8, 9],
    [0, 7, 7, 7, 7, 7, 7, 7, 8, 9],
    [0, 8, 8, 8, 8, 8, 8, 8, 8, 9],
    [0, 9, 9, 9, 9, 9, 9, 9, 9, 9],
  ];

  private readonly TABLE_E: number[][] = [
    [],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [0, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [0, 3, 3, 3, 4, 5, 6, 7, 8, 9, 10],
    [0, 4, 4, 4, 4, 5, 6, 7, 8, 9, 10],
    [0, 5, 5, 5, 5, 5, 6, 7, 8, 9, 10],
    [0, 6, 6, 6, 6, 6, 6, 7, 8, 9, 10],
    [0, 7, 7, 7, 7, 7, 7, 7, 8, 9, 10],
    [0, 8, 8, 8, 8, 8, 8, 8, 8, 9, 10],
    [0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10],
    [0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  ];

  calculate(input: RosaInput): RosaScores {
    const seatHeight = this.scoreSeatHeight(input.chair);
    const seatDepth = this.scoreSeatDepth(input.chair);
    const armrests = this.scoreArmrests(input.chair);
    const backrest = this.scoreBackrest(input.chair);

    const seatPlusDepth = Math.max(1, Math.min(seatHeight + seatDepth, 8));
    const armrestsPlusBackrest = Math.min(armrests + backrest, 9);
    const chairTableA = this.TABLE_A[seatPlusDepth][armrestsPlusBackrest];
    const chairUsageTime = this.scoreUsageTime(input.chair.chairUsageTime);
    const chairTotal = Math.max(1, Math.min(10, chairTableA + chairUsageTime));

    const screenRaw = this.scoreScreen(input.screen);
    const screenUsageTime = this.scoreUsageTime(input.screen.screenUsageTime);
    const screenWithTime = Math.max(0, screenRaw + screenUsageTime);

    const phoneRaw = this.scorePhone(input.screen);
    const phoneUsageTime = this.scoreUsageTime(input.screen.phoneUsageTime);
    const phoneWithTime = Math.max(0, phoneRaw + phoneUsageTime);

    const screenIndex = Math.min(screenWithTime, 7);
    const phoneIndex = Math.min(phoneWithTime, 6);
    const tableB = this.TABLE_B[phoneIndex][screenIndex];

    const mouseRaw = this.scoreMouse(input.peripherals);
    const mouseUsageTime = this.scoreUsageTime(input.peripherals.mouseUsageTime);
    const mouseWithTime = Math.max(0, mouseRaw + mouseUsageTime);

    const keyboardRaw = this.scoreKeyboard(input.peripherals);
    const keyboardUsageTime = this.scoreUsageTime(input.peripherals.keyboardUsageTime);
    const keyboardWithTime = Math.max(0, keyboardRaw + keyboardUsageTime);

    const mouseIndex = Math.min(mouseWithTime, 7);
    const keyboardIndex = Math.min(keyboardWithTime, 7);
    const tableC = this.TABLE_C[mouseIndex][keyboardIndex];

    const tableBIndex = Math.max(1, Math.min(tableB, 9));
    const tableCIndex = Math.max(1, Math.min(tableC, 9));
    const tableD = this.TABLE_D[tableBIndex][tableCIndex];

    const chairIndex = Math.max(1, Math.min(chairTotal, 10));
    const tableDIndex = Math.max(1, Math.min(tableD, 10));
    const rosaFinal = this.TABLE_E[chairIndex][tableDIndex];

    const { riskLevel, actionLevel, actionRequired } = this.getRiskLevel(rosaFinal);
    const recommendations = this.buildRecommendations(input, {
      seatHeight, seatDepth, armrests, backrest,
      screenRaw, phoneRaw, mouseRaw, keyboardRaw,
    });

    return {
      seatHeight, seatDepth, armrests, backrest,
      chairTableA, chairUsageTime, chairTotal,
      screenRaw, screenWithTime,
      phoneRaw, phoneWithTime,
      tableB,
      mouseRaw, mouseWithTime,
      keyboardRaw, keyboardWithTime,
      tableC,
      tableD,
      rosaFinal,
      riskLevel,
      actionLevel,
      actionRequired,
      recommendations,
    };
  }

  private scoreSeatHeight(c: RosaChairInput): number {
    let score = c.seatHeight;
    if (c.seatHeightNoLegRoom) score += 1;
    if (c.seatHeightNotAdjustable) score += 1;
    return score;
  }

  private scoreSeatDepth(c: RosaChairInput): number {
    let score = c.seatDepth;
    if (c.seatDepthNotAdjustable) score += 1;
    return score;
  }

  private scoreArmrests(c: RosaChairInput): number {
    let score = c.armrests;
    if (c.armrestsTooWide) score += 1;
    if (c.armrestsSurfaceHard) score += 1;
    if (c.armrestsNotAdjustable) score += 1;
    return score;
  }

  private scoreBackrest(c: RosaChairInput): number {
    let score = c.backrest;
    if (c.backrestShouldersRaised) score += 1;
    if (c.backrestNotAdjustable) score += 1;
    return score;
  }

  private scoreScreen(s: RosaScreenInput): number {
    let score = s.screen;
    if (s.screenTilted) score += 1;
    if (s.screenDocumentsNoHolder) score += 1;
    if (s.screenGlare) score += 1;
    if (s.screenTooFar && s.screen === 2) score += 1;
    return score;
  }

  private scorePhone(s: RosaScreenInput): number {
    let score = s.phone;
    if (s.phoneNeck) score += 2;
    if (s.phoneNoHandsFree) score += 1;
    return score;
  }

  private scoreMouse(p: RosaPeripheralsInput): number {
    let score = p.mouse;
    if (p.mouseSmall) score += 1;
    if (p.mouseDifferentHeight) score += 2;
    if (p.mouseWristPressure) score += 1;
    return score;
  }

  private scoreKeyboard(p: RosaPeripheralsInput): number {
    let score = p.keyboard;
    if (p.keyboardWristDeviated) score += 1;
    if (p.keyboardTooHigh) score += 1;
    if (p.keyboardObjectsOverhead) score += 1;
    if (p.keyboardNotAdjustable) score += 1;
    return score;
  }

  private scoreUsageTime(time: number): number {
    if (time === 1) return -1;
    if (time === 2) return 0;
    if (time === 3) return 1;
    return 0;
  }

  private getRiskLevel(score: number): {
    riskLevel: string;
    actionLevel: number;
    actionRequired: string;
  } {
    if (score === 1) return { riskLevel: 'Inapreciable', actionLevel: 0, actionRequired: 'No es necesaria actuación.' };
    if (score <= 4) return { riskLevel: 'Mejorable', actionLevel: 1, actionRequired: 'Pueden mejorarse algunos elementos del puesto.' };
    if (score === 5) return { riskLevel: 'Alto', actionLevel: 2, actionRequired: 'Es necesaria la actuación.' };
    if (score <= 8) return { riskLevel: 'Muy Alto', actionLevel: 3, actionRequired: 'Es necesaria la actuación cuanto antes.' };
    return { riskLevel: 'Extremo', actionLevel: 4, actionRequired: 'Es necesaria la actuación urgentemente.' };
  }

  private buildRecommendations(input: RosaInput, scores: Record<string, number>): string[] {
    const recs: string[] = [];

    if (scores.seatHeight >= 2) {
      if (input.chair.seatHeight === 2) recs.push('Ajustar la altura del asiento para que las rodillas formen un ángulo de 90°.');
      if (input.chair.seatHeight === 3) recs.push('Reducir la altura del asiento para evitar que los pies queden sin contacto con el suelo.');
      if (input.chair.seatHeightNoLegRoom) recs.push('Ampliar el espacio libre bajo la mesa para permitir movilidad de piernas.');
      if (input.chair.seatHeightNotAdjustable) recs.push('Reemplazar la silla por una con altura de asiento regulable.');
    }

    if (scores.seatDepth >= 2) {
      if (input.chair.seatDepth === 2) recs.push('Ajustar la profundidad del asiento para mantener entre 8 cm entre el asiento y la parte posterior de las rodillas.');
      if (input.chair.seatDepthNotAdjustable) recs.push('Reemplazar la silla por una con profundidad de asiento regulable.');
    }

    if (scores.armrests >= 2) {
      if (input.chair.armrests === 2) recs.push('Ajustar los reposabrazos para que los codos queden alineados con los hombros.');
      if (input.chair.armrestsTooWide) recs.push('Reducir la separación entre los reposabrazos.');
      if (input.chair.armrestsSurfaceHard) recs.push('Instalar reposabrazos con superficie acolchada.');
      if (input.chair.armrestsNotAdjustable) recs.push('Reemplazar los reposabrazos por unos ajustables.');
    }

    if (scores.backrest >= 2) {
      if (input.chair.backrest === 2) recs.push('Ajustar el respaldo para que soporte adecuadamente la zona lumbar (95°-110°).');
      if (input.chair.backrestShouldersRaised) recs.push('Bajar la superficie de trabajo para relajar los hombros.');
      if (input.chair.backrestNotAdjustable) recs.push('Reemplazar la silla por una con respaldo ajustable.');
    }

    if (scores.screenRaw >= 2) {
      if (input.screen.screen === 2) recs.push('Elevar la pantalla para que el borde superior quede al nivel de los ojos y a entre 45-75 cm de distancia.');
      if (input.screen.screen === 3) recs.push('Reducir la altura de la pantalla para evitar extensión de cuello.');
      if (input.screen.screenTilted) recs.push('Reposicionar la pantalla frente al trabajador para evitar rotación cervical.');
      if (input.screen.screenDocumentsNoHolder) recs.push('Instalar un atril o soporte de documentos junto a la pantalla.');
      if (input.screen.screenGlare) recs.push('Eliminar brillos y reflejos en la pantalla usando filtros o reposicionando la iluminación.');
      if (input.screen.screenTooFar) recs.push('Acercar la pantalla al rango de 45-75 cm del trabajador.');
    }

    if (scores.phoneRaw >= 2) {
      if (input.screen.phone === 2) recs.push('Acercar el teléfono al puesto de trabajo, a menos de 30 cm del trabajador.');
      if (input.screen.phoneNeck) recs.push('Utilizar auriculares o manos libres para evitar sujetar el teléfono con el cuello.');
      if (input.screen.phoneNoHandsFree) recs.push('Instalar función de manos libres en el teléfono.');
    }

    if (scores.mouseRaw >= 2) {
      if (input.peripherals.mouse === 2) recs.push('Reposicionar el mouse para que quede alineado con el hombro y cerca del cuerpo.');
      if (input.peripherals.mouseSmall) recs.push('Reemplazar el mouse por uno de tamaño adecuado a la mano del trabajador.');
      if (input.peripherals.mouseDifferentHeight) recs.push('Nivelar el mouse y el teclado a la misma altura.');
      if (input.peripherals.mouseWristPressure) recs.push('Instalar un reposamuñecas blando para reducir la presión en la muñeca al usar el mouse.');
    }

    if (scores.keyboardRaw >= 2) {
      if (input.peripherals.keyboard === 2) recs.push('Instalar una bandeja extraíble para teclado que permita mantener las muñecas en posición neutra.');
      if (input.peripherals.keyboardWristDeviated) recs.push('Corregir la posición del teclado para evitar desviación lateral de las muñecas.');
      if (input.peripherals.keyboardTooHigh) recs.push('Reducir la altura del teclado para que los hombros estén relajados.');
      if (input.peripherals.keyboardObjectsOverhead) recs.push('Reorganizar el espacio de trabajo para eliminar la necesidad de alcanzar objetos por encima de la cabeza.');
      if (input.peripherals.keyboardNotAdjustable) recs.push('Reemplazar la superficie de trabajo o teclado por uno ajustable en altura.');
    }

    if (recs.length === 0) recs.push('El puesto de trabajo cumple con los estándares ergonómicos. Se recomienda revisión periódica.');

    return recs;
  }
}