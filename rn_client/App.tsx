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
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
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
import {
  WELCOME_MESSAGE,
  getNextReply,
  makeId,
  type ChatMessage,
} from "./src/data/dummyChat";
import { colors } from "./src/theme";

const TYPING_DELAY = 1200;

function AppContent() {
  const insets = useSafeAreaInsets();
  const [splashDone, setSplashDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitVisible, setExitVisible] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [typing, setTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const listRef = useRef<FlatList<ChatMessage>>(null);

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
    (text: string) => {
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

      setTimeout(() => {
        const botMsg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text: getNextReply(),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setTyping(false);
        scrollToEnd();
      }, TYPING_DELAY);
    },
    [scrollToEnd],
  );

  const handleNewChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setShowSuggestions(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <MessageBubble message={item} index={index} />
    ),
    [],
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
          <ChatHeader onMenuPress={() => setDrawerOpen(true)} />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
                  <SuggestedPrompts onPick={handleSend} visible={showSuggestions} />
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
