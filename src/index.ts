import { Cbor, CborBytes, Term, UPLCEncoder, UPLCProgram, compile, unit } from "@harmoniclabs/plu-ts";
import { contract } from "./contract";
import { writeFile } from "fs/promises";

void async function main()
{
    const compiled = UPLCEncoder.compile(
        new UPLCProgram(
            [1,0,0],
            contract()
        )
    ).toBuffer().buffer;

    await writeFile("./non_recursive.uplc", compiled);
    await writeFile("./non_recursive.cbor.hex.txt", Cbor.encode( new CborBytes( compiled ) ).toString() );
}()