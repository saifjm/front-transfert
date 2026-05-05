package tn.smi.workflow.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
public class SpelEvaluator {

    private final ExpressionParser parser = new SpelExpressionParser();

    /**
     * Evaluate a SpEL expression with given variables as context.
     *
     * @param expression SpEL expression string
     * @param variables  map of variable name -> value
     * @return true if expression evaluates to true, false otherwise
     */
    public boolean evaluate(String expression, Map<String, Object> variables) {
        if (expression == null || expression.isBlank()) {
            return true; // no condition means always match
        }
        try {
            StandardEvaluationContext context = new StandardEvaluationContext();
            if (variables != null) {
                variables.forEach(context::setVariable);
            }
            Boolean result = parser.parseExpression(expression).getValue(context, Boolean.class);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.warn("Error evaluating SpEL expression '{}': {}", expression, e.getMessage());
            return false;
        }
    }
}

