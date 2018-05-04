import { FunctionTable, ExpressionEvaluator, CompiledExpression, FunctionTableProvider, ExpressionCompiler, compileExpression } from '../utils/expression';
import { GameState } from '../gameState';

export interface EventExpressionFunctionTable extends FunctionTable {
    // Math functions. 
    random(): number;
    max(...values: number[]): number;
    min(...values: number[]): number;
    floor(x: number): number;
    round(x: number): number;
    ceil(x: number): number;
    clip(x: number, min: number, max: number): number;
    // Game state related function.
    eventOccurred(id: string): boolean;
    itemCount(id: string): number;
    totalMonths(): number;
    hasStatus(id: string): boolean;
    calcEffectValue(id: string, base: number): number;
}

export type CompiledEventExpression = CompiledExpression<EventExpressionFunctionTable>;
export type EventExpressionCompiler = ExpressionCompiler<EventExpressionFunctionTable>;
export type EventExpressionEvaluator = ExpressionEvaluator<EventExpressionFunctionTable>;
export type EventFunctionTableProvider = FunctionTableProvider<EventExpressionFunctionTable>;

export class EventExpressionEngine implements EventFunctionTableProvider, EventExpressionCompiler, EventExpressionEvaluator {

    private _fTable: EventExpressionFunctionTable;
    private _gameState: GameState;
    private _cache: { [key: string]: CompiledEventExpression } = {};

    constructor(gs: GameState) {
        this._gameState = gs;
        this._fTable = this._initFunctionTable();
    }

    private _initFunctionTable(): EventExpressionFunctionTable {
        return {
            getVar: varName => this._gameState.getVar(varName, true),
            eventOccurred: id => this._gameState.occurredEvents[id] != undefined,
            itemCount: id => this._gameState.playerInventory.count(id),
            totalMonths: () => this._gameState.getVar('year', true) * 12 + this._gameState.getVar('month', true),
            calcEffectValue: (id, base) => {
                const eItem = this._gameState.playerInventory.calcCombinedEffectValue(id);
                const eStatus = this._gameState.playerStatus.calcCombinedEffectValue(id);
                return (base + eItem[0] + eStatus[0]) * eItem[1] * eStatus[1];
            },
            hasStatus: id => this._gameState.playerStatus.count(id) > 0,
            random: Math.random,
            max: Math.max,
            min: Math.min,
            floor: Math.floor,
            round: Math.round,
            ceil: Math.ceil,
            clip: (x, min, max) => x < min ? x : (x > max ? max : x)
        };
    }

    getClosure(): EventExpressionFunctionTable {
        return this._fTable;
    }

    existsFunction(fname: string): boolean {
        return this._fTable[fname] != undefined;
    }

    compile(expr: string | number): CompiledEventExpression {
        if (typeof expr === "number") {
            return {
                source: expr.toString(),
                fn: () => expr
            };
        }
        if (!this._cache[expr]) {
            this._cache[expr] = compileExpression(expr, this);
        }
        return this._cache[expr];
    }

    eval(expr: CompiledExpression<EventExpressionFunctionTable>): number {
        let val = expr.fn(this.getClosure());
        if (isNaN(val)) throw new Error('Expression produced NaN.');
        return val;
    }

}
