"use client"

import React, { createContext, useReducer, type ReactNode } from "react"
import type { ConversationState, ConversationAction } from "./types"

const initialState: ConversationState = {
  messages: [],
  expandedCardId: null,
  pinnedCardId: null,
  navigationStack: [{ type: "home" }],
  isLoading: false,
  analysisContext: null,
  chatHistory: [],
}

function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      }
    case "SET_EXPANDED_CARD":
      return {
        ...state,
        expandedCardId: action.payload,
      }
    case "SET_PINNED_CARD":
      return {
        ...state,
        pinnedCardId: action.payload,
      }
    case "PUSH_NAVIGATION":
      return {
        ...state,
        navigationStack: [...state.navigationStack, action.payload],
      }
    case "POP_NAVIGATION":
      return {
        ...state,
        navigationStack: state.navigationStack.slice(0, -1),
        expandedCardId: null,
      }
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    case "SET_ANALYSIS_CONTEXT":
      return {
        ...state,
        analysisContext: action.payload,
      }
    case "ADD_CHAT_HISTORY":
      return {
        ...state,
        chatHistory: [...state.chatHistory, action.payload],
      }
    case "CLEAR_CONVERSATION":
      return initialState
    default:
      return state
  }
}

export const ConversationContext = createContext<
  | {
      state: ConversationState
      dispatch: React.Dispatch<ConversationAction>
    }
  | undefined
>(undefined)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState)

  return (
    <ConversationContext.Provider value={{ state, dispatch }}>
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversation() {
  const context = React.useContext(ConversationContext)
  if (!context) {
    throw new Error("useConversation must be used within ConversationProvider")
  }
  return context
}
