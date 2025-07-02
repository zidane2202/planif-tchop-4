import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, PanResponder, Animated, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import ChatbotScreen from '../screens/ChatbotScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 56;

export default function ChatbotBubble(props) {
  const [open, setOpen] = useState(false);
  // Position initiale : en bas à droite
  const pan = useRef(new Animated.ValueXY({
    x: SCREEN_WIDTH - BUBBLE_SIZE - 24,
    y: SCREEN_HEIGHT - BUBBLE_SIZE - 80,
  })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([
        null,
        { dx: pan.x, dy: pan.y }
      ], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        // Optionnel : empêcher de sortir de l'écran
        let newX = pan.x._value;
        let newY = pan.y._value;
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > SCREEN_WIDTH - BUBBLE_SIZE) newX = SCREEN_WIDTH - BUBBLE_SIZE;
        if (newY > SCREEN_HEIGHT - BUBBLE_SIZE - 24) newY = SCREEN_HEIGHT - BUBBLE_SIZE - 24;
        pan.setValue({ x: newX, y: newY });
      },
    })
  ).current;

  return (
    <>
      <Modal visible={open} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
              <ChatbotScreen {...props} />
              <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
                <FontAwesome name="close" size={28} color="#CE1126" />
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
      <Animated.View
        style={[styles.bubble, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={() => setOpen(true)}>
          <FontAwesome name="comments" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    backgroundColor: '#007A5E',
    borderRadius: BUBBLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    padding: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '95%',
    backgroundColor: '#f4f7fa',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    elevation: 2,
  },
}); 