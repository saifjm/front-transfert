package tn.smi.workflow.flowable.listeners;

import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.TaskListener;
import org.flowable.task.service.delegate.DelegateTask;
import org.springframework.stereotype.Component;

/**
 * Listener triggered when a user task is completed.
 */
@Slf4j
@Component
public class OnTaskCompleteListener implements TaskListener {

    @Override
    public void notify(DelegateTask delegateTask) {
        String decisionTag = (String) delegateTask.getVariable("decisionTag");
        String currentNodeKey = (String) delegateTask.getVariable("currentNodeKey");

        log.info("Task completed: taskId={}, processInstanceId={}, decisionTag={}, nodeKey={}",
                delegateTask.getId(), delegateTask.getProcessInstanceId(), decisionTag, currentNodeKey);
    }
}
