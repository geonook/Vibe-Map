import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRouteFeedback } from '../hooks/useRouteFeedback';
import { VibeWeights } from '../types/vibe';

interface RouteFeedbackFormProps {
  routeId: string;
  routeLabel: string;
  vibeWeights: VibeWeights;
  storedRouteId?: string | null;
}

const ratingOptions = [1, 2, 3, 4, 5];

export function RouteFeedbackForm({ routeId, routeLabel, vibeWeights, storedRouteId }: RouteFeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { mutateAsync, isPending, error, reset } = useRouteFeedback();

  const remoteErrorMessage = useMemo(() => {
    if (!error) return null;
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return '提交回饋時發生未知錯誤，請稍後再試。';
  }, [error]);

  const validationError = touched && rating === 0 ? '請先選擇評分再送出回饋。' : null;
  const helperMessage = validationError ?? remoteErrorMessage;

  const handleSelectRating = useCallback(
    (value: number) => {
      setRating(value);
      setTouched(false);
      if (submitted) {
        setSubmitted(false);
      }
      if (error) {
        reset();
      }
    },
    [error, reset, submitted]
  );

  const handleCommentChange = useCallback(
    (value: string) => {
      setComment(value);
      if (submitted) {
        setSubmitted(false);
      }
      if (error) {
        reset();
      }
    },
    [error, reset, submitted]
  );

  const handleSubmit = useCallback(async () => {
    setTouched(true);
    if (rating === 0 || isPending) {
      return;
    }

    try {
      await mutateAsync({
        routeId,
        routeLabel,
        rating,
        comment,
        vibeWeights,
        storedRouteId,
      });
      setSubmitted(true);
      setRating(0);
      setComment('');
      setTouched(false);
      reset();
    } catch (submitError) {
      console.error('Failed to submit route feedback', submitError);
    }
  }, [comment, isPending, mutateAsync, rating, reset, routeId, routeLabel, storedRouteId, vibeWeights]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>分享你的走後感</Text>
      <Text style={styles.subtitle}>幫我們了解這條路線是否符合你的氛圍期待。</Text>

      <View style={styles.ratingRow}>
        {ratingOptions.map((value) => {
          const isActive = value <= rating;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.ratingPill, isActive && styles.ratingPillActive]}
              onPress={() => handleSelectRating(value)}
              accessibilityRole="button"
              accessibilityLabel={`給予 ${value} 分`}
            >
              <Text style={[styles.ratingLabel, isActive && styles.ratingLabelActive]}>{value}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={styles.commentInput}
        multiline
        placeholder="想說些什麼？告訴我們亮點、缺點或沿途的感受。"
        placeholderTextColor="#9ca3af"
        value={comment}
        onChangeText={handleCommentChange}
        editable={!isPending}
      />

      {helperMessage ? <Text style={styles.helperText}>{helperMessage}</Text> : null}
      {submitted ? <Text style={styles.successText}>感謝你的分享！我們會用回饋讓路線更貼近你的期待。</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, (isPending || rating === 0) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isPending || rating === 0}
      >
        <Text style={styles.submitButtonText}>{isPending ? '送出中…' : '送出回饋'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2430',
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingPill: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
  },
  ratingPillActive: {
    backgroundColor: '#f97316',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  ratingLabelActive: {
    color: '#fff7ed',
  },
  commentInput: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  helperText: {
    fontSize: 13,
    color: '#dc2626',
  },
  successText: {
    fontSize: 13,
    color: '#047857',
  },
  submitButton: {
    marginTop: 4,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
});
