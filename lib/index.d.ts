import { Context, Schema } from 'koishi';
export declare const name = "ffxiv-bot-hcn";
export declare const usage = "\u6307\u4EE4\uFF1A\u67E5\u4EF7 <\u7269\u54C1\u540D>";
export interface Config {
    DataCenter: {
        Server: any;
    };
    Server: string;
    Gst: boolean;
    Limit: number;
}
export declare const schema: Schema<Schemastery.ObjectS<{
    DataCenter: Schema<Schemastery.ObjectS<{
        Server: Schema<string, string>;
    }>, Schemastery.ObjectT<{
        Server: Schema<string, string>;
    }>>;
}> | Schemastery.ObjectS<{
    Gst: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    Limit: Schema<number, number>;
}>, {
    DataCenter: Schemastery.ObjectT<{
        Server: Schema<string, string>;
    }>;
} & import("cosmokit").Dict & {
    Gst: boolean;
} & {
    Limit: number;
}>;
export declare function apply(ctx: Context, config: Config): void;
