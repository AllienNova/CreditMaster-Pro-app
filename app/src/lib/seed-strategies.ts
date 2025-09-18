import { supabase } from './supabase';
import { ADVANCED_STRATEGIES } from './strategies';

export async function seedStrategies() {
  try {
    console.log('Seeding strategies to database...');
    
    // Clear existing strategies
    const { error: deleteError } = await supabase
      .from('strategies')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.warn('Error clearing existing strategies:', deleteError);
    }

    // Insert all strategies
    const strategiesData = ADVANCED_STRATEGIES.map(strategy => ({
      id: strategy.id,
      strategy_name: strategy.name,
      strategy_type: strategy.type,
      legal_basis: strategy.legal_basis,
      success_rate: strategy.success_rate,
      tier: strategy.tier,
      target_items: strategy.target_items,
      key_tactics: strategy.key_tactics,
      prerequisites: strategy.prerequisites || [],
      is_active: true
    }));

    const { data, error } = await supabase
      .from('strategies')
      .insert(strategiesData)
      .select();

    if (error) {
      throw error;
    }

    console.log(`Successfully seeded ${data.length} strategies`);
    return data;
  } catch (error) {
    console.error('Error seeding strategies:', error);
    throw error;
  }
}

// Function to update strategy success rates based on execution results
export async function updateStrategySuccessRates() {
  try {
    console.log('Updating strategy success rates...');
    
    // Get execution statistics for each strategy
    const { data: executions, error } = await supabase
      .from('strategy_executions')
      .select('strategy_id, success')
      .not('success', 'is', null);

    if (error) throw error;

    // Calculate success rates
    const strategyStats = executions.reduce((acc, execution) => {
      const strategyId = execution.strategy_id;
      if (!acc[strategyId]) {
        acc[strategyId] = { total: 0, successful: 0 };
      }
      acc[strategyId].total++;
      if (execution.success) {
        acc[strategyId].successful++;
      }
      return acc;
    }, {} as Record<string, { total: number; successful: number }>);

    // Update strategies with new success rates
    for (const [strategyId, stats] of Object.entries(strategyStats)) {
      if (stats.total >= 10) { // Only update if we have enough data
        const successRate = (stats.successful / stats.total) * 100;
        
        const { error: updateError } = await supabase
          .from('strategies')
          .update({ success_rate: successRate })
          .eq('id', strategyId);

        if (updateError) {
          console.error(`Error updating strategy ${strategyId}:`, updateError);
        }
      }
    }

    console.log('Strategy success rates updated');
  } catch (error) {
    console.error('Error updating strategy success rates:', error);
  }
}

// Function to get strategy performance analytics
export async function getStrategyAnalytics() {
  try {
    const { data, error } = await supabase
      .from('strategies')
      .select(`
        *,
        strategy_executions (
          execution_status,
          success,
          created_at
        )
      `);

    if (error) throw error;

    return data.map(strategy => {
      const executions = strategy.strategy_executions || [];
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter((e: any) => e.success === true).length;
      const pendingExecutions = executions.filter((e: any) => e.execution_status === 'pending').length;
      const completedExecutions = executions.filter((e: any) => e.execution_status === 'completed').length;

      return {
        ...strategy,
        analytics: {
          total_executions: totalExecutions,
          successful_executions: successfulExecutions,
          pending_executions: pendingExecutions,
          completed_executions: completedExecutions,
          actual_success_rate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
          theoretical_success_rate: strategy.success_rate
        }
      };
    });
  } catch (error) {
    console.error('Error getting strategy analytics:', error);
    return [];
  }
}

