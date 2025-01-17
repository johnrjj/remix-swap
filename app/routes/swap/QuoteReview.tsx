import clsx from "clsx";
import { formatUnits } from "@ethersproject/units";
import {
  useAccountModal,
  useAddRecentTransaction,
} from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useSendTransaction,
  usePrepareSendTransaction,
} from "wagmi";
import { shorten } from "./utils";
import { primaryButton } from "./index";
import { ExchangeRate } from "~/components";
import { getTokenListBySymbol, ZERO_EX_PROXY } from "~/constants";

import type { Dispatch } from "react";
import type { SwapTranslations } from "./index";
import type { IReducerState, ActionTypes } from "./reducer";

export function QuoteReview({
  state,
  dispatch,
  translations,
}: {
  state: IReducerState;
  dispatch: Dispatch<ActionTypes>;
  translations: SwapTranslations;
}) {
  const { address } = useAccount();
  const { openAccountModal } = useAccountModal();
  const addRecentTransaction = useAddRecentTransaction();
  const gasLimit = state.quote?.gas
    ? Math.round(Number(state.quote.gas) * 1.2).toString()
    : undefined;

  const params = new URLSearchParams(window.location.search);
  const isHardhat = params.get("network") === "hardhat";

  const { config } = usePrepareSendTransaction({
    chainId: isHardhat ? 31337 : state.quote?.chainId,
    request: {
      to:
        state.quote?.to ||
        ZERO_EX_PROXY[state.quote?.chainId.toString() || "1"],
      from: address,
      data: state.quote?.data,
      chainId: state.quote?.chainId,
      gasLimit,
      gasPrice: state.quote?.gasPrice,
    },
  });

  const { sendTransaction, isLoading: isSendingTransaction } =
    useSendTransaction({
      ...config,
      onSettled: (_, error) => {
        if (error === null) {
          dispatch({ type: "set sell amount", payload: "" });
          dispatch({ type: "set buy amount", payload: "" });
          dispatch({ type: "set quote", payload: undefined });
          dispatch({ type: "set buy amount", payload: "" });
          dispatch({ type: "set finalize order" });
          openAccountModal && openAccountModal();
        }
      },
      onSuccess: ({ hash }) => {
        addRecentTransaction({ hash, description: shorten(hash) });
        openAccountModal && openAccountModal();
      },
    });

  if (!state.quote || !state.chainId) {
    return <span>Loading...</span>;
  }

  const tokensBySymbol = getTokenListBySymbol(state.chainId);

  return (
    <div className="p-3 mx-auto max-w-screen-sm ">
      <button
        onClick={() => {
          dispatch({ type: "set finalize order" });
          dispatch({ type: "set buy amount", payload: "" });
          dispatch({ type: "set sell amount", payload: "" });
        }}
        className="inline-block text-slate-50 p-1 cursor-pointer hover:underline hover:text-slate-50 active:underline active:text-slate-50"
      >
        &#8592; {translations["Back"]}
      </button>
      <form>
        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-sm mb-3">
          <div className="text-xl mb-2">{translations["You pay"]}</div>
          <div className="flex items-center text-lg sm:text-3xl">
            <img
              alt={state.sellToken}
              className="h-9 w-9 mr-2 rounded-md"
              src={tokensBySymbol[state.sellToken].logoURI}
            />
            <span>{formatUnits(state.quote.sellAmount, 18)}</span>
            <div className="ml-2">{state.sellToken.toUpperCase()}</div>
          </div>
        </div>
        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-sm">
          <div className="text-xl mb-2">{translations["You receive"]}</div>
          <div className="flex items-center text-lg sm:text-3xl">
            <img
              alt={state.buyToken}
              className="h-9 w-9 mr-2 rounded-md"
              src={tokensBySymbol[state.buyToken].logoURI}
            />
            <div>{formatUnits(state.quote.buyAmount, 18)}</div>
            <div className="ml-2">{state.buyToken.toUpperCase()}</div>
          </div>
        </div>
        <div className="flex justify-center my-3">
          {state.chainId ? (
            <ExchangeRate
              sellToken={state.sellToken}
              buyToken={state.buyToken}
              sellAmount={state.quote.sellAmount}
              buyAmount={state.quote.buyAmount}
              chainId={state.chainId}
            />
          ) : null}
        </div>
        <button
          type="button"
          className={clsx(
            primaryButton.element,
            !(state.fetching || state.quote === undefined)
              ? primaryButton.pseudo
              : "",
            "py-1 px-2 w-full"
          )}
          onClick={() => {
            sendTransaction && sendTransaction();
          }}
        >
          {isSendingTransaction
            ? `${translations["Submitting"]}…`
            : translations["Submit Order"]}
        </button>
      </form>
    </div>
  );
}
