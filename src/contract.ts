import { Application, Builtin, Delay, ErrorUPLC, Force, Lambda, UPLCConst, UPLCTerm, UPLCVar } from "@harmoniclabs/plu-ts";

function drop( n : number, term: UPLCTerm ): UPLCTerm
{
    for( let i = 0; i < n; i++ )
    {
        term = new Application(
            Builtin.tailList,
            term
        );
    }
    
    return term;
}

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

const innerZ = new Lambda(
    new Application(
        new UPLCVar( 1 ), // Z
        new Lambda(
            new Application(
                new Application(
                    new UPLCVar( 1 ), // toMakeRecursive
                    new UPLCVar( 1 )  // toMakeRecursive ( self )
                ),
                new UPLCVar( 0 ) // first argument (other than self)
            )
        )
    )
);

const z_comb = new Lambda(
    new Application(
        innerZ.clone(),
        innerZ.clone()
    )
);

const check_recursive = new Application(
    z_comb,
    new Lambda( // self
        new Lambda( // list
            ifThenElse(
                apply(
                    Builtin.nullList,
                    new UPLCVar( 0 ) // list
                ),
                new ErrorUPLC(),
                ifThenElse(
                    apply(
                        new UPLCVar( 2 ), // is_withdrawal_cred
                        getFstPair(
                            apply(
                                Builtin.headList,
                                new UPLCVar( 0 ) // list
                            )
                        )                        
                    ),
                    UPLCConst.unit,
                    apply(
                        new UPLCVar( 1 ), // self
                        apply(
                            Builtin.tailList,
                            new UPLCVar( 0 )
                        )
                    )

                )
            )
        )
    )
);

function getManyIfThenElses(): UPLCTerm
{
    const n_inlined = 9;
    let term: UPLCTerm = apply(
        check_recursive,
        drop( n_inlined, new UPLCVar( 2 ) ) // ctx.tx.withdrawals.slice( n_inlined - 1 )
    );
    
    for( let i = n_inlined; i >= 0; i-- )
    {
        term = ifThenElse(
            apply(
                new UPLCVar( 0 ), // is_withdrawal_cred
                getFstPair( elemAt( i, new UPLCVar( 1 ) ) ) // ctx.tx.withdrawals[i].fst
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