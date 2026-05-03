package tn.smi.workflow.flowable.delegates;

import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

@Slf4j
@Component("routeDelegate")
public class RouteDelegate implements JavaDelegate {

    @Override
    public void execute(DelegateExecution execution) {
        String decisionTag = (String) execution.getVariable("decisionTag");
        Boolean endProcess = (Boolean) execution.getVariable("endProcess");
        String currentNodeKey = (String) execution.getVariable("currentNodeKey");

        log.info("RouteDelegate executing: decisionTag={}, endProcess={}, nodeKey={}",
                decisionTag, endProcess, currentNodeKey);

        if (endProcess == null) {
            execution.setVariable("endProcess", false);
        }
    }
}
