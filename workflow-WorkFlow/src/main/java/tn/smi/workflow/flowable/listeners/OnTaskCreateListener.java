package tn.smi.workflow.flowable.listeners;

import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.TaskListener;
import org.flowable.task.service.delegate.DelegateTask;
import org.springframework.stereotype.Component;

/**
 * Listener triggered when a user task is created.
 */
@Slf4j
@Component
public class OnTaskCreateListener implements TaskListener {

    @Override
    public void notify(DelegateTask delegateTask) {
        String nodeKey = (String) delegateTask.getVariable("currentNodeKey");

        log.info("Task created: taskId={}, processInstanceId={}, nodeKey={}",
                delegateTask.getId(), delegateTask.getProcessInstanceId(), nodeKey);

        // Set task name based on node key
        if (nodeKey != null) {
            delegateTask.setName("Task: " + nodeKey);
        }
    }
}

