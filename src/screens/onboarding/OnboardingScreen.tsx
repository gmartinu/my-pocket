import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { useTheme } from 'react-native-paper';
import { setOnboardingSeen } from '../../utils/offlineCache';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const theme = useTheme();

  const handleComplete = async () => {
    await setOnboardingSeen();
    onComplete();
  };

  return (
    <Onboarding
      onDone={handleComplete}
      onSkip={handleComplete}
      pages={[
        {
          backgroundColor: theme.colors.primary,
          image: (
            <View style={styles.imageContainer}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
              </View>
            </View>
          ),
          title: 'Bem-vindo ao My Pocket',
          subtitle: 'Seu app de gerenciamento financeiro pessoal e familiar',
        },
        {
          backgroundColor: theme.colors.secondary,
          image: (
            <View style={styles.imageContainer}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
                <View style={styles.emojiContainer}>
                  <View style={styles.emoji}>💰</View>
                </View>
              </View>
            </View>
          ),
          title: 'Gerencie suas Despesas e Cartões',
          subtitle: 'Acompanhe todos os seus gastos mensais e faturas de cartão em um só lugar',
        },
        {
          backgroundColor: theme.colors.tertiary,
          image: (
            <View style={styles.imageContainer}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <View style={styles.emojiContainer}>
                  <View style={styles.emoji}>👨‍👩‍👧‍👦</View>
                </View>
              </View>
            </View>
          ),
          title: 'Compartilhe com sua Família',
          subtitle: 'Crie workspaces e compartilhe o controle financeiro com as pessoas que você ama',
        },
        {
          backgroundColor: theme.colors.primary,
          image: (
            <View style={styles.imageContainer}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                <View style={styles.emojiContainer}>
                  <View style={styles.emoji}>📊</View>
                </View>
              </View>
            </View>
          ),
          title: 'Relatórios e Insights',
          subtitle: 'Visualize gráficos e acompanhe a evolução dos seus gastos ao longo do tempo',
        },
        {
          backgroundColor: theme.colors.secondary,
          image: (
            <View style={styles.imageContainer}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
                <View style={styles.emojiContainer}>
                  <View style={styles.emoji}>☁️</View>
                </View>
              </View>
            </View>
          ),
          title: 'Tudo Sincronizado em Tempo Real',
          subtitle: 'Seus dados são salvos na nuvem e sincronizados automaticamente entre todos os dispositivos',
        },
      ]}
      bottomBarColor={theme.colors.surface}
      containerStyles={{
        paddingHorizontal: 24,
      }}
      titleStyles={{
        fontWeight: 'bold',
        fontSize: 24,
        color: '#FFFFFF',
      }}
      subTitleStyles={{
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.9,
        textAlign: 'center',
        paddingHorizontal: 24,
      }}
      skipLabel="Pular"
      nextLabel="Próximo"
      DoneButtonComponent={({ ...props }) => (
        <View style={styles.doneButton}>
          <View {...props}>
            <View style={styles.doneButtonText}>Começar</View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    width: 120,
    height: 120,
  },
  emojiContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
  },
  doneButton: {
    paddingHorizontal: 24,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
});
