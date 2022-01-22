export interface Location {
    gameAcc: string,
    coords: Coords,
    feature: null | Feature,
    troops: null | Troop,
    tileOwner: null | string,
}

export interface Coords {
    x: number,
    y: number
}

export interface Feature {
    drop_table: DropTable,
    weight: number, 
    name: string,
    link: string,
    scanRecovery: number,
    lastScanned: number, // slot when this feature was last scanned
    timesScanned: number
}

export interface Troop {
    name: string, //64
    link: string, //64  example is 63: //https://arweave.net/zt3-t8SHDSck0TLcSuC-hdQb2E0civ0DVMRgwf6sCz0
    class: TroopClass, 
    range: number,
    power: number, 
    modInf: number, 
    modArmor: number,
    modAir: number, 
    recovery: number, //might have *really* slow, really powerful units in the future?
    lastMoved: number
}

export interface DropTable {
    [variant: string] : {}
}

export interface TroopClass {
    [variant: string] : {}
}

export interface Card {
    dropTable: DropTable,
    id: number,
    cardType: CardType,
}

export interface CardType {
    [variant: string]: {} | {unit: Troop} | {umod: UnitMod}
}

export interface UnitMod{
    name: string,
    link: string,
    class: TroopClass,
    range: number,
    power: number,
    modInf: number,
    modArmor: number,
    modAir: number,
    recovery: number
}

export interface RedeemableCard {
    dropTable: DropTable,
    id: number
}

export interface Player {
    name: string,
    authority: string,
    cards: Card[],
    redeemableCards: RedeemableCard[]
}
