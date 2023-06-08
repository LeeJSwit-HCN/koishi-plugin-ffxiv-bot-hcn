import { Context, Schema } from 'koishi';
export declare const name = "ffxiv-bot";
export interface Config {
    Data_Center?: string;
    Server?: string;
    Gst?: boolean;
    Limit?: number;
}
export declare const schema: Schema<Schemastery.ObjectS<{
    Data_Center: Schema<string, string>;
}> | Schemastery.ObjectS<{
    Gst: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    Limit: Schema<number, number>;
}>, {
    Data_Center: string;
} & import("cosmokit").Dict & {
    Gst: boolean;
} & {
    Limit: number;
}>;
export declare function apply(ctx: Context, config: Config): void;
