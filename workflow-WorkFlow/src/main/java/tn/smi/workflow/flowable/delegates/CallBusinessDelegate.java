package tn.smi.workflow.flowable.delegates;

import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

/**
 * Delegate for calling the business MS.
 * In this architecture, the actual HTTP call is made by WorkflowRuntimeService,
 * so this delegate just serves as a BPMN placeholder for documentation.
 */
@Slf4j
@Component("callBusinessDelegate")
public class CallBusinessDelegate implements JavaDelegate {

    @Override
    public void execute(DelegateExecution execution) {
        String businessKey = execution.getProcessInstanceBusinessKey();
        String nodeKey = (String) execution.getVariable("currentNodeKey");
        String decisionTag = (String) execution.getVariable("decisionTag");

        log.info("CallBusinessDelegate: businessKey={}, nodeKey={}, decisionTag={}",
                businessKey, nodeKey, decisionTag);

        // The actual business call is orchestrated by WorkflowRuntimeService
        // This delegate is a pass-through in the BPMN
    }
}

