import { Application, Builtin, Delay, ErrorUPLC, Force, Lambda, UPLCConst, UPLCTerm, UPLCVar } from "@harmoniclabs/plu-ts";

function elemAt( n : number, term: UPLCTerm ): UPLCTerm
{
    for( let i = 0; i < n; i++ )
    {
        term = new Application(
            Builtin.tailList,
            term
        );
    }

    return new Application(
        Builtin.headList,
        term
    );
}

function getFields( term: UPLCTerm ): UPLCTerm
{
    return new Application(
        Builtin.sndPair,
        new Application(
            Builtin.unConstrData,
            term
        )
    );
}

function apply( ...terms: [ UPLCTerm, UPLCTerm, ...UPLCTerm[] ] ): UPLCTerm
{
    let term: UPLCTerm = new Application(
        terms.shift()!,
        terms.shift()!
    );

    while( terms.length > 0 )
    {
        term = new Application(
            term,
            terms.shift()!
        )
    }
    
    return term;
}

function getFstPair( term: UPLCTerm ): UPLCTerm
{
    return new Application(
        Builtin.fstPair,
        term
    )
}

function ifThenElse(
    condition: UPLCTerm,
    caseTrue: UPLCTerm,
    caseFalse: UPLCTerm
): UPLCTerm
{
    return new Force(
        apply(
            Builtin.ifThenElse,
            condition,
            new Delay( caseTrue ),
            new Delay( caseFalse )
        )
    );
}

function getManyIfThenElses(): UPLCTerm
{
    let term: UPLCTerm = new ErrorUPLC();
    
    for( let i = 49; i >= 0; i-- )
    {
        term = ifThenElse(
            apply(
                new UPLCVar( 0 ), // is_withdrawal_cred
                getFstPair( elemAt( i, new UPLCVar( 1 ) ) ) // ctx.tx.withdrawals[0].fst
            ),
            UPLCConst.unit, // then ok
            // else continue till error
            term
        );
    }

    return term
}

export function contract(): UPLCTerm
{
    return new Lambda( // script_withdrawal_credential
        new Lambda( // datum
            new Lambda( // redeemer
                new Lambda( // ctx
                    new Application(
                        new Lambda( // ctx.tx.withdrawals
                            new Application( // is_withdrawal_cred
                                new Lambda( getManyIfThenElses() ), // this is the contract
                                new Application(
                                    Builtin.equalsData,
                                    new UPLCVar( 4 ) // script_withdrawal_credential
                                )
                            )
                        ),
                        new Application(
                            Builtin.unMapData,
                            elemAt(
                                6, // withdrawals
                                getFields(
                                    elemAt(
                                        0, // tx
                                        getFields( new UPLCVar( 0 ) ) // ctx.raw.fields
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    )
}