import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AppBackground } from "./src/components/AppBackground";
import { SplashScreen } from "./src/components/SplashScreen";
import { ChatHeader } from "./src/components/ChatHeader";
import { MessageBubble } from "./src/components/MessageBubble";
import { TypingIndicator } from "./src/components/TypingIndicator";
import { ChatComposer } from "./src/components/ChatComposer";
import { SuggestedPrompts } from "./src/components/SuggestedPrompts";
import { Disclaimer } from "./src/components/Disclaimer";
import { SideDrawer } from "./src/components/SideDrawer";
import { ExitModal } from "./src/components/ExitModal";
import { WELCOME_MESSAGE, makeId } from "./src/data/dummyChat";
import { DEFAULT_LANGUAGE } from "./src/data/dummySessions";
import { sendChat, checkServer } from "./src/lib/api";
import type { ChatMessage } from "./src/lib/types";
import { colors } from "./src/theme";

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [splashDone, setSplashDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitVisible, setExitVisible] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [typing, setTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const sessionRef = useRef(generateSessionId());

  // Ping server on mount and periodically
  useEffect(() => {
    let mounted = true;
    const ping = async () => {
      const ok = await checkServer();
      if (mounted) setServerOnline(ok);
    };
    ping();
    const interval = setInterval(ping, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (!exitVisible) {
        setExitVisible(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [drawerOpen, exitVisible]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      setShowSuggestions(false);
      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setTyping(true);
      scrollToEnd();

      try {
        const res = await sendChat({
          session_id: sessionRef.current,
          message: text,
          language_code: languageCode !== "en-IN" ? languageCode : null,
        });

        const botMsg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text: res.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch (e: any) {
        const errMsg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text: e.message || "Something went wrong. Tap to retry.",
          timestamp: Date.now(),
          error: true,
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setTyping(false);
        scrollToEnd();
      }
    },
    [scrollToEnd, languageCode],
  );

  const handleRetry = useCallback(
    (errorMsgId: string) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === errorMsgId);
        if (idx < 1) return prev;
        const userMsg = prev[idx - 1];
        if (userMsg?.role !== "user") return prev;
        const updated = prev.filter((m) => m.id !== errorMsgId);
        setTimeout(() => handleSend(userMsg.text), 0);
        return updated;
      });
    },
    [handleSend],
  );

  const handleNewChat = useCallback(() => {
    sessionRef.current = generateSessionId();
    setMessages([WELCOME_MESSAGE]);
    setShowSuggestions(true);
  }, []);

  const handleLanguageChange = useCallback((code: string) => {
    setLanguageCode(code);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <MessageBubble
        message={item}
        index={index}
        languageCode={languageCode}
        onRetry={item.error ? () => handleRetry(item.id) : undefined}
      />
    ),
    [languageCode, handleRetry],
  );

  const contentPad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 6),
  };

  if (!splashDone) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <AppBackground>
          <View style={[styles.content, contentPad]}>
            <SplashScreen onFinish={() => setSplashDone(true)} />
          </View>
        </AppBackground>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AppBackground>
        <View style={[styles.content, contentPad]}>
          <ChatHeader
            onMenuPress={() => setDrawerOpen(true)}
            serverOnline={serverOnline}
          />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <FlatList
              ref={listRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollToEnd()}
              ListFooterComponent={
                <>
                  <SuggestedPrompts
                    onPick={handleSend}
                    visible={showSuggestions}
                  />
                  {typing ? <TypingIndicator /> : null}
                </>
              }
            />

            <View style={styles.composerWrap}>
              <ChatComposer onSend={handleSend} disabled={typing} />
              <Disclaimer />
            </View>
          </KeyboardAvoidingView>
        </View>

        <SideDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onNewChat={handleNewChat}
          selectedLanguage={languageCode}
          onLanguageChange={handleLanguageChange}
        />

        <ExitModal
          visible={exitVisible}
          onStay={() => setExitVisible(false)}
          onEnd={() => BackHandler.exitApp()}
        />
      </AppBackground>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  content: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148,163,184,0.2)",
    backgroundColor: "rgba(15,23,42,0.55)",
  },
});
