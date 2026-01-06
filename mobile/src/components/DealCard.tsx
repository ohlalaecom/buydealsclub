import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Deal } from '../types';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.lg * 2;

interface DealCardProps {
  deal: Deal;
  onPress: () => void;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onPress }) => {
  const discountPercentage = Math.round(
    ((deal.original_price - deal.deal_price) / deal.original_price) * 100
  );

  const timeLeft = new Date(deal.expires_at).getTime() - Date.now();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image
        source={{ uri: deal.image_url }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>-{discountPercentage}%</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.originalPrice}>€{deal.original_price.toFixed(2)}</Text>
          <Text style={styles.dealPrice}>€{deal.deal_price.toFixed(2)}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.timer}>
            <Text style={styles.timerText}>
              ⏰ {hoursLeft}h {minutesLeft}m left
            </Text>
          </View>
          <View style={styles.stock}>
            <Text style={styles.stockText}>
              {deal.stock_quantity > 0 ? `${deal.stock_quantity} left` : 'Sold out'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceSecondary,
  },
  badge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  originalPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  dealPrice: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: '600',
  },
  stock: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  stockText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
